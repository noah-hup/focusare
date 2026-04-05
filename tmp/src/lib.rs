use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use serde::{Deserialize, Serialize};

fn notes_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
        .join("notes")
}

fn trash_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
        .join("trash")
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[tauri::command]
fn list_modules(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = notes_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let mut modules = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().is_dir() {
            if let Some(name) = entry.file_name().to_str() {
                modules.push(name.to_string());
            }
        }
    }
    modules.sort();
    Ok(modules)
}

#[tauri::command]
fn create_module(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let dir = notes_dir(&app).join(&name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_module(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let src = notes_dir(&app).join(&name);
    let trash = trash_dir(&app);
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;

    let ts = now_secs();
    let dest_name = format!("{}__module__{}", ts, name);
    let dest = trash.join(&dest_name);
    fs::rename(&src, &dest).map_err(|e| e.to_string())
}

/// Resolve the directory for a module + subfolder path.
/// `subfolder` is a slash-separated relative path (empty string = module root).
/// Each segment is validated to prevent path traversal.
fn note_dir(app: &tauri::AppHandle, module: &str, subfolder: &str) -> Result<PathBuf, String> {
    let mut dir = notes_dir(app).join(module);
    if !subfolder.is_empty() {
        for seg in subfolder.split('/') {
            if seg.is_empty() || seg == ".." || seg == "." {
                return Err("invalid subfolder path".to_string());
            }
            dir = dir.join(seg);
        }
    }
    Ok(dir)
}

#[tauri::command]
fn list_subfolders(app: tauri::AppHandle, module: String, subfolder: String) -> Result<Vec<String>, String> {
    let dir = note_dir(&app, &module, &subfolder)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let mut subs = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().is_dir() {
            if let Some(name) = entry.file_name().to_str() {
                subs.push(name.to_string());
            }
        }
    }
    subs.sort();
    Ok(subs)
}

#[tauri::command]
fn create_subfolder(app: tauri::AppHandle, module: String, subfolder: String, name: String) -> Result<(), String> {
    if name.is_empty() || name == ".." || name == "." || name.contains('/') {
        return Err("invalid subfolder name".to_string());
    }
    let parent = note_dir(&app, &module, &subfolder)?;
    let dir = parent.join(&name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_subfolder(app: tauri::AppHandle, module: String, subfolder: String) -> Result<(), String> {
    let src = note_dir(&app, &module, &subfolder)?;
    let trash = trash_dir(&app);
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;

    let ts = now_secs();
    // encode the full path so trash id is unique
    let encoded = subfolder.replace('/', "__slash__");
    let dest_name = format!("{}__subfolder__{}__{}", ts, module, encoded);
    let dest = trash.join(&dest_name);
    fs::rename(&src, &dest).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_subfolder(
    app: tauri::AppHandle,
    module: String,
    subfolder: String,
    new_path: String,
) -> Result<(), String> {
    // new_path is a slash-separated path relative to the module root.
    // Validate every segment.
    for seg in new_path.split('/') {
        if seg.is_empty() || seg == ".." || seg == "." {
            return Err("invalid subfolder path".to_string());
        }
    }
    let src = note_dir(&app, &module, &subfolder)?;
    let dest = note_dir(&app, &module, &new_path)?;
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dest).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_notes(app: tauri::AppHandle, module: String, subfolder: String) -> Result<Vec<String>, String> {
    let dir = note_dir(&app, &module, &subfolder)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("md") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                notes.push(stem.to_string());
            }
        }
    }
    notes.sort();
    Ok(notes)
}

#[tauri::command]
fn read_note(app: tauri::AppHandle, module: String, subfolder: String, note: String) -> Result<String, String> {
    let path = note_dir(&app, &module, &subfolder)?.join(format!("{}.md", note));
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_note(
    app: tauri::AppHandle,
    module: String,
    subfolder: String,
    note: String,
    content: String,
) -> Result<(), String> {
    let dir = note_dir(&app, &module, &subfolder)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.md", note));
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_note(app: tauri::AppHandle, module: String, subfolder: String, note: String) -> Result<(), String> {
    let src = note_dir(&app, &module, &subfolder)?.join(format!("{}.md", note));
    let trash = trash_dir(&app);
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;

    let ts = now_secs();
    // encode subfolder into trash name — use __slash__ so we keep a flat trash
    let full_path = if subfolder.is_empty() {
        module.clone()
    } else {
        format!("{}/{}", module, subfolder).replace('/', "__slash__")
    };
    let dest_name = format!("{}__{}__{}.md", ts, full_path, note);
    let dest = trash.join(&dest_name);
    fs::rename(&src, &dest).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_note(
    app: tauri::AppHandle,
    module: String,
    subfolder: String,
    old_name: String,
    new_subfolder: String,
    new_name: String,
) -> Result<(), String> {
    let old_dir = note_dir(&app, &module, &subfolder)?;
    let new_dir = note_dir(&app, &module, &new_subfolder)?;
    fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?;
    let old_path = old_dir.join(format!("{}.md", old_name));
    let new_path = new_dir.join(format!("{}.md", new_name));
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

// ── Notes search ──

#[derive(Serialize)]
pub struct NoteSearchResult {
    module: String,
    subfolder: String,
    name: String,
}

/// Walk a directory recursively, reading every .md file and collecting those
/// whose content (case-insensitively) contains `query`.
fn walk_search(
    dir: &PathBuf,
    module: &str,
    subfolder: &str,
    query: &str,
    results: &mut Vec<NoteSearchResult>,
) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let seg = entry.file_name();
            let seg = seg.to_string_lossy();
            let child_subfolder = if subfolder.is_empty() {
                seg.to_string()
            } else {
                format!("{}/{}", subfolder, seg)
            };
            walk_search(&path, module, &child_subfolder, query, results)?;
        } else if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("md") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                let content = fs::read_to_string(&path).unwrap_or_default();
                if content.to_lowercase().contains(query) {
                    results.push(NoteSearchResult {
                        module: module.to_string(),
                        subfolder: subfolder.to_string(),
                        name: stem.to_string(),
                    });
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn search_notes(app: tauri::AppHandle, module: String, query: String) -> Result<Vec<NoteSearchResult>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let query_lower = query.to_lowercase();
    let dir = notes_dir(&app).join(&module);
    let mut results = Vec::new();
    if dir.is_dir() {
        walk_search(&dir, &module, "", &query_lower, &mut results)?;
    }
    results.sort_by(|a, b| a.subfolder.cmp(&b.subfolder).then(a.name.cmp(&b.name)));
    Ok(results)
}

// ── Flashcards ──

fn flashcards_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
        .join("flashcards")
}

fn flashcards_file(app: &tauri::AppHandle) -> PathBuf {
    flashcards_dir(app).join("flashcards.json")
}

fn fc_folders_file(app: &tauri::AppHandle) -> PathBuf {
    flashcards_dir(app).join("fc_folders.json")
}

fn load_fc_folder_list(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = fc_folders_file(app);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save_fc_folder_list(app: &tauri::AppHandle, folders: &[String]) -> Result<(), String> {
    let dir = flashcards_dir(app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let raw = serde_json::to_string(folders).map_err(|e| e.to_string())?;
    fs::write(fc_folders_file(app), raw).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Flashcard {
    id: String,
    folder: String,
    front: String, // HTML content
    back: String,  // HTML content
    color: String, // "red" | "yellow" | "green" | ""
}

fn load_flashcards(app: &tauri::AppHandle) -> Result<Vec<Flashcard>, String> {
    let path = flashcards_file(app);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save_flashcards(app: &tauri::AppHandle, cards: &Vec<Flashcard>) -> Result<(), String> {
    let dir = flashcards_dir(app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = flashcards_file(app);
    let raw = serde_json::to_string(cards).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_flashcards(app: tauri::AppHandle) -> Result<Vec<Flashcard>, String> {
    load_flashcards(&app)
}

#[tauri::command]
fn create_flashcard(app: tauri::AppHandle, card: Flashcard) -> Result<(), String> {
    let mut cards = load_flashcards(&app)?;
    cards.push(card);
    save_flashcards(&app, &cards)
}

#[tauri::command]
fn update_flashcard(app: tauri::AppHandle, card: Flashcard) -> Result<(), String> {
    let mut cards = load_flashcards(&app)?;
    if let Some(pos) = cards.iter().position(|c| c.id == card.id) {
        cards[pos] = card;
        save_flashcards(&app, &cards)
    } else {
        Err("Flashcard not found".to_string())
    }
}

#[tauri::command]
fn delete_flashcard(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut cards = load_flashcards(&app)?;
    let pos = cards.iter().position(|c| c.id == id).ok_or("not found")?;
    let card = cards.remove(pos);
    save_flashcards(&app, &cards)?;
    // Move to FC trash
    let preview: String = {
        let tmp = card.front.replace('<', " ").replace('>', " ");
        let t: String = tmp.split_whitespace().collect::<Vec<_>>().join(" ");
        t.chars().take(60).collect()
    };
    let mut trash = load_fc_trash(&app)?;
    trash.push(FcTrashItem {
        id: format!("{}__fccard__{}", now_secs(), id),
        kind: "card".to_string(),
        name: if preview.is_empty() { "(empty)".to_string() } else { preview },
        folder: card.folder.clone(),
        cards: vec![card],
        deleted_at: now_secs(),
    });
    save_fc_trash(&app, &trash)
}

#[tauri::command]
fn list_fc_folders(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let cards = load_flashcards(&app)?;
    let stored = load_fc_folder_list(&app)?;
    let mut folders: Vec<String> = cards
        .iter()
        .map(|c| c.folder.clone())
        .filter(|f| !f.is_empty())
        .chain(stored.into_iter())
        .collect();
    folders.sort();
    folders.dedup();
    Ok(folders)
}

#[tauri::command]
fn create_fc_folder(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let mut folders = load_fc_folder_list(&app)?;
    // Also add all parent segments so intermediate folders are visible
    let segs: Vec<&str> = name.split('/').collect();
    for i in 1..=segs.len() {
        let path = segs[..i].join("/");
        if !folders.contains(&path) {
            folders.push(path);
        }
    }
    folders.sort();
    save_fc_folder_list(&app, &folders)
}

#[tauri::command]
fn rename_fc_folder(app: tauri::AppHandle, old_name: String, new_name: String) -> Result<(), String> {
    let mut cards = load_flashcards(&app)?;
    let prefix = format!("{}/", old_name);
    for card in &mut cards {
        if card.folder == old_name {
            card.folder = new_name.clone();
        } else if card.folder.starts_with(&prefix) {
            card.folder = format!("{}/{}", new_name, &card.folder[prefix.len()..]);
        }
    }
    save_flashcards(&app, &cards)?;
    // Also rename in folder list
    let mut folders = load_fc_folder_list(&app)?;
    for f in &mut folders {
        if *f == old_name {
            *f = new_name.clone();
        } else if f.starts_with(&prefix) {
            *f = format!("{}/{}", new_name, &f[prefix.len()..]);
        }
    }
    folders.sort();
    folders.dedup();
    save_fc_folder_list(&app, &folders)
}

#[tauri::command]
fn delete_fc_folder(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let mut cards = load_flashcards(&app)?;
    let prefix = format!("{}/", name);
    let removed: Vec<Flashcard> = cards
        .iter()
        .filter(|c| c.folder == name || c.folder.starts_with(&prefix))
        .cloned()
        .collect();
    cards.retain(|c| c.folder != name && !c.folder.starts_with(&prefix));
    save_flashcards(&app, &cards)?;
    // Also remove from folder list
    let mut folders = load_fc_folder_list(&app)?;
    folders.retain(|f| f != &name && !f.starts_with(&prefix));
    save_fc_folder_list(&app, &folders)?;
    // Move to FC trash as a folder entry
    let mut trash = load_fc_trash(&app)?;
    trash.push(FcTrashItem {
        id: format!("{}__fcfolder__{}", now_secs(), name.replace('/', "__slash__")),
        kind: "folder".to_string(),
        name: name.split('/').last().unwrap_or(&name).to_string(),
        folder: name.clone(),
        cards: removed,
        deleted_at: now_secs(),
    });
    save_fc_trash(&app, &trash)
}

// ── FC Trash ──

fn fc_trash_file(app: &tauri::AppHandle) -> PathBuf {
    flashcards_dir(app).join("fc_trash.json")
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FcTrashItem {
    id: String,
    kind: String,      // "card" or "folder"
    name: String,      // display name (card front preview or folder name)
    folder: String,    // original folder path
    cards: Vec<Flashcard>, // for folders: all cards that were in it; for cards: one card
    deleted_at: u64,
}

fn load_fc_trash(app: &tauri::AppHandle) -> Result<Vec<FcTrashItem>, String> {
    let path = fc_trash_file(app);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save_fc_trash(app: &tauri::AppHandle, items: &[FcTrashItem]) -> Result<(), String> {
    let dir = flashcards_dir(app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let raw = serde_json::to_string(items).map_err(|e| e.to_string())?;
    fs::write(fc_trash_file(app), raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_fc_trash(app: tauri::AppHandle) -> Result<Vec<FcTrashItem>, String> {
    let mut items = load_fc_trash(&app)?;
    items.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    Ok(items)
}

#[tauri::command]
fn restore_fc_trash_item(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut trash = load_fc_trash(&app)?;
    let pos = trash.iter().position(|i| i.id == id).ok_or("not found")?;
    let item = trash.remove(pos);
    save_fc_trash(&app, &trash)?;
    let mut cards = load_flashcards(&app)?;
    for card in item.cards {
        if !cards.iter().any(|c| c.id == card.id) {
            cards.push(card);
        }
    }
    save_flashcards(&app, &cards)?;
    // Re-create the folder in the folder list if it's a folder item
    if item.kind == "folder" {
        let mut folders = load_fc_folder_list(&app)?;
        if !folders.contains(&item.folder) {
            folders.push(item.folder.clone());
            // Ensure parent segments exist too
            let segs: Vec<&str> = item.folder.split('/').collect();
            for i in 1..segs.len() {
                let parent = segs[..i].join("/");
                if !folders.contains(&parent) {
                    folders.push(parent);
                }
            }
            folders.sort();
            save_fc_folder_list(&app, &folders)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn delete_fc_trash_item(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut trash = load_fc_trash(&app)?;
    trash.retain(|i| i.id != id);
    save_fc_trash(&app, &trash)
}

#[tauri::command]
fn purge_old_fc_trash(app: tauri::AppHandle) -> Result<(), String> {
    let cutoff = now_secs().saturating_sub(14 * 24 * 60 * 60);
    let mut trash = load_fc_trash(&app)?;
    trash.retain(|i| i.deleted_at >= cutoff);
    save_fc_trash(&app, &trash)
}

// ── Study Sessions ──

fn sessions_file(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
        .join("study_sessions.json")
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StudySession {
    id: String,
    date: String,       // "YYYY-MM-DD"
    duration: u64,      // seconds
    started_at: u64,    // unix timestamp
}

fn load_sessions(app: &tauri::AppHandle) -> Result<Vec<StudySession>, String> {
    let path = sessions_file(app);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save_sessions(app: &tauri::AppHandle, sessions: &Vec<StudySession>) -> Result<(), String> {
    let path = sessions_file(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string(sessions).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_sessions(app: tauri::AppHandle) -> Result<Vec<StudySession>, String> {
    load_sessions(&app)
}

#[tauri::command]
fn save_session(app: tauri::AppHandle, session: StudySession) -> Result<(), String> {
    let mut sessions = load_sessions(&app)?;
    sessions.push(session);
    save_sessions(&app, &sessions)
}

#[tauri::command]
fn delete_session(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut sessions = load_sessions(&app)?;
    sessions.retain(|s| s.id != id);
    save_sessions(&app, &sessions)
}

// ── Calendar ──

fn calendar_file(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
        .join("calendar.json")
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CalendarEvent {
    id: String,
    title: String,
    date: String,       // "YYYY-MM-DD"
    start_time: String, // "HH:MM" (24h), empty for all-day
    end_time: String,   // "HH:MM" (24h), empty for all-day
    color: String,      // hex or named colour
    notes: String,
}

fn load_events(app: &tauri::AppHandle) -> Result<Vec<CalendarEvent>, String> {
    let path = calendar_file(app);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save_events(app: &tauri::AppHandle, events: &Vec<CalendarEvent>) -> Result<(), String> {
    let path = calendar_file(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string(events).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_events(app: tauri::AppHandle) -> Result<Vec<CalendarEvent>, String> {
    load_events(&app)
}

#[tauri::command]
fn create_event(app: tauri::AppHandle, event: CalendarEvent) -> Result<(), String> {
    let mut events = load_events(&app)?;
    events.push(event);
    save_events(&app, &events)
}

#[tauri::command]
fn update_event(app: tauri::AppHandle, event: CalendarEvent) -> Result<(), String> {
    let mut events = load_events(&app)?;
    if let Some(pos) = events.iter().position(|e| e.id == event.id) {
        events[pos] = event;
        save_events(&app, &events)
    } else {
        Err("Event not found".to_string())
    }
}

#[tauri::command]
fn delete_event(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut events = load_events(&app)?;
    events.retain(|e| e.id != id);
    save_events(&app, &events)
}

// ── Trash ──

#[derive(serde::Serialize)]
pub struct TrashItem {
    id: String,        // full filename without extension (or full name for dirs)
    name: String,      // display name
    module: String,    // for notes: original module; for modules: empty string
    kind: String,      // "note" or "module"
    deleted_at: u64,
}

#[tauri::command]
fn list_trash(app: tauri::AppHandle) -> Result<Vec<TrashItem>, String> {
    let trash = trash_dir(&app);
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for entry in fs::read_dir(&trash).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name();
        let name_str = file_name.to_string_lossy().to_string();

        // Module: {ts}__module__{name}  (directory)
        // Note:   {ts}__{module}__{note}.md  (file)
        if entry.path().is_dir() {
            if let Some(rest) = name_str.strip_prefix(|_: char| true) {
                let _ = rest; // suppress unused warning
            }
            // parse: ts__module__name
            let parts: Vec<&str> = name_str.splitn(3, "__").collect();
            if parts.len() == 3 && parts[1] == "module" {
                if let Ok(ts) = parts[0].parse::<u64>() {
                    items.push(TrashItem {
                        id: name_str.clone(),
                        name: parts[2].to_string(),
                        module: String::new(),
                        kind: "module".to_string(),
                        deleted_at: ts,
                    });
                }
            }
        } else if name_str.ends_with(".md") {
            let stem = &name_str[..name_str.len() - 3];
            let parts: Vec<&str> = stem.splitn(3, "__").collect();
            if parts.len() == 3 {
                if let Ok(ts) = parts[0].parse::<u64>() {
                    items.push(TrashItem {
                        id: stem.to_string(),
                        name: parts[2].to_string(),
                        module: parts[1].to_string(),
                        kind: "note".to_string(),
                        deleted_at: ts,
                    });
                }
            }
        }
    }
    items.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    Ok(items)
}

#[tauri::command]
fn restore_trash_item(app: tauri::AppHandle, id: String, kind: String) -> Result<(), String> {
    let trash = trash_dir(&app);
    let notes = notes_dir(&app);

    if kind == "module" {
        let src = trash.join(&id);
        // id = {ts}__module__{name}
        let parts: Vec<&str> = id.splitn(3, "__").collect();
        if parts.len() != 3 {
            return Err("invalid trash id".to_string());
        }
        let dest = notes.join(parts[2]);
        fs::rename(&src, &dest).map_err(|e| e.to_string())
    } else {
        let src = trash.join(format!("{}.md", id));
        // id = {ts}__{module}__{note}
        let parts: Vec<&str> = id.splitn(3, "__").collect();
        if parts.len() != 3 {
            return Err("invalid trash id".to_string());
        }
        let module_dir = notes.join(parts[1]);
        fs::create_dir_all(&module_dir).map_err(|e| e.to_string())?;
        let dest = module_dir.join(format!("{}.md", parts[2]));
        fs::rename(&src, &dest).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn delete_trash_item(app: tauri::AppHandle, id: String, kind: String) -> Result<(), String> {
    let trash = trash_dir(&app);
    if kind == "module" {
        let path = trash.join(&id);
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        let path = trash.join(format!("{}.md", id));
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn purge_old_trash(app: tauri::AppHandle) -> Result<(), String> {
    let trash = trash_dir(&app);
    if !trash.exists() {
        return Ok(());
    }
    let cutoff = now_secs().saturating_sub(14 * 24 * 60 * 60);

    for entry in fs::read_dir(&trash).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name();
        let name_str = file_name.to_string_lossy().to_string();

        let ts_str = name_str.splitn(2, "__").next().unwrap_or("");
        if let Ok(ts) = ts_str.parse::<u64>() {
            if ts < cutoff {
                let path = entry.path();
                if path.is_dir() {
                    let _ = fs::remove_dir_all(&path);
                } else {
                    let _ = fs::remove_file(&path);
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn reorder_flashcards(app: tauri::AppHandle, ids: Vec<String>) -> Result<(), String> {
    let mut cards = load_flashcards(&app)?;
    // Rebuild array in the given id order; any ids not found are ignored,
    // any cards not mentioned are appended at the end (shouldn't happen in normal use).
    let mut reordered: Vec<Flashcard> = ids.iter()
        .filter_map(|id| cards.iter().find(|c| &c.id == id).cloned())
        .collect();
    // Append any cards that weren't in the ids list (safety net)
    for card in &cards {
        if !ids.contains(&card.id) {
            reordered.push(card.clone());
        }
    }
    cards = reordered;
    save_flashcards(&app, &cards)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_modules,
            create_module,
            delete_module,
            list_subfolders,
            create_subfolder,
            delete_subfolder,
            rename_subfolder,
            list_notes,
            search_notes,
            read_note,
            write_note,
            delete_note,
            rename_note,
            list_trash,
            restore_trash_item,
            delete_trash_item,
            purge_old_trash,
            list_events,
            create_event,
            update_event,
            delete_event,
            list_flashcards,
            create_flashcard,
            update_flashcard,
            delete_flashcard,
            reorder_flashcards,
            list_fc_folders,
            create_fc_folder,
            rename_fc_folder,
            delete_fc_folder,
            list_fc_trash,
            restore_fc_trash_item,
            delete_fc_trash_item,
            purge_old_fc_trash,
            list_sessions,
            save_session,
            delete_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
