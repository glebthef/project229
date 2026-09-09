import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import {
  createEventAdmin,
  updateEventAdmin,
  deleteEventAdmin,
  getEvents,
  finishEvent,
  createSportAdmin,
  deleteSportAdmin,
  getSports,
  getAllUsers,
  banUser,
  updateLiveScore,
  getAllChatsAdmin,
  getChatMessages,
  sendChatMessage,
} from "../api";

const emptyForm = {
  sport_slug: "",
  league: "",
  home: "",
  away: "",
  starts_at: "",
  odd_p1: "",
  odd_x: "",
  odd_p2: "",
  total_value: "",
  odd_total_over: "",
  odd_total_under: "",
  handicap_value: "",
  odd_handicap_home: "",
  odd_handicap_away: "",
};

// Backend sends "2026-09-10T20:00:00Z"; <input type="datetime-local"> needs
// "2026-09-10T20:00" in the browser's own local time.
function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Admin() {
  const { user } = useAuth();

  const [sports, setSports] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState([]);
  const [scores, setScores] = useState({});

  const [sportForm, setSportForm] = useState({ name: "", icon: "", slug: "" });
  const [sportMessage, setSportMessage] = useState("");
  const [users, setUsers] = useState([]);

  const [chats, setChats] = useState([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReply, setChatReply] = useState("");
  const [chatError, setChatError] = useState("");

  const loadEvents = () => {
    getEvents().then(setEvents).catch(() => setEvents([]));
  };
  const loadUsers = () => {
    getAllUsers(user.secret).then(setUsers).catch(() => setUsers([]));
  };
  const loadSports = () => {
    getSports().then(setSports).catch(() => setSports([]));
  };
  const loadChats = () => {
    getAllChatsAdmin(user.secret).then(setChats).catch(() => setChats([]));
  };
  const loadChatMessages = (userId) => {
    getChatMessages(userId, user.secret).then(setChatMessages).catch(() => setChatMessages([]));
  };

  useEffect(() => {
    loadEvents();
    loadUsers();
    loadSports();
    loadChats();
  }, []);

  // Пока открыт какой-то диалог — подтягиваем список чатов (превью/новые
  // треды) и сообщения выбранного треда, чтобы видеть ответы в реальном
  // времени без ручного обновления страницы.
  useEffect(() => {
    const interval = setInterval(() => {
      loadChats();
      if (selectedChatUserId) loadChatMessages(selectedChatUserId);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedChatUserId]);

  const handleSelectChat = (userId) => {
    setSelectedChatUserId(userId);
    setChatError("");
    loadChatMessages(userId);
  };

  const handleSendReply = async () => {
    const text = chatReply.trim();
    if (!text || !selectedChatUserId) return;
    setChatError("");
    try {
      const msg = await sendChatMessage(selectedChatUserId, user.secret, text);
      setChatMessages((prev) => [...prev, msg]);
      setChatReply("");
      loadChats();
    } catch (err) {
      setChatError("Ошибка: " + err.message);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const buildEventPayload = () => ({
    sport_slug: form.sport_slug,
    league: form.league,
    home: form.home,
    away: form.away,
    starts_at: new Date(form.starts_at).toISOString(),
    odd_p1: parseFloat(form.odd_p1),
    odd_x: form.odd_x ? parseFloat(form.odd_x) : null,
    odd_p2: parseFloat(form.odd_p2),
    total_value: form.total_value ? parseFloat(form.total_value) : null,
    odd_total_over: form.odd_total_over ? parseFloat(form.odd_total_over) : null,
    odd_total_under: form.odd_total_under ? parseFloat(form.odd_total_under) : null,
    handicap_value: form.handicap_value ? parseFloat(form.handicap_value) : null,
    odd_handicap_home: form.odd_handicap_home ? parseFloat(form.odd_handicap_home) : null,
    odd_handicap_away: form.odd_handicap_away ? parseFloat(form.odd_handicap_away) : null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      if (editingEventId) {
        await updateEventAdmin(user.secret, editingEventId, buildEventPayload());
        setMessage(`Событие ${editingEventId} обновлено`);
      } else {
        await createEventAdmin(user.secret, buildEventPayload());
        setMessage("Событие создано");
      }
      setForm(emptyForm);
      setEditingEventId(null);
      loadEvents();
    } catch (err) {
      setMessage("Ошибка: " + err.message);
    }
  };

  const handleEditClick = (ev) => {
    setEditingEventId(ev.id);
    setForm({
      sport_slug: ev.sport_slug || "",
      league: ev.league || "",
      home: ev.home || "",
      away: ev.away || "",
      starts_at: toDatetimeLocal(ev.starts_at),
      odd_p1: ev.odd_p1 ?? "",
      odd_x: ev.odd_x ?? "",
      odd_p2: ev.odd_p2 ?? "",
      total_value: ev.total_value ?? "",
      odd_total_over: ev.odd_total_over ?? "",
      odd_total_under: ev.odd_total_under ?? "",
      handicap_value: ev.handicap_value ?? "",
      odd_handicap_home: ev.odd_handicap_home ?? "",
      odd_handicap_away: ev.odd_handicap_away ?? "",
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setForm(emptyForm);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm(`Удалить событие #${eventId}?`)) return;
    try {
      await deleteEventAdmin(user.secret, eventId);
      loadEvents();
    } catch (err) {
      setMessage("Ошибка: " + err.message);
    }
  };

  const handleScoreChange = (eventId, field, value) => {
    setScores({ ...scores, [eventId]: { ...scores[eventId], [field]: value } });
  };

  const handleFinish = async (eventId) => {
    const s = scores[eventId] || {};
    try {
      await finishEvent(user.secret, eventId, parseInt(s.home), parseInt(s.away));
      setMessage(`Событие ${eventId} завершено`);
      loadEvents();
    } catch (err) {
      setMessage("Ошибка: " + err.message);
    }
  };

  const handleUpdateScore = async (eventId) => {
    const s = scores[eventId] || {};
    try {
      await updateLiveScore(user.secret, eventId, parseInt(s.home), parseInt(s.away));
      setMessage(`Счёт события ${eventId} обновлён`);
      loadEvents();
    } catch (err) {
      setMessage("Ошибка: " + err.message);
    }
  };

  const handleSportChange = (e) => {
    setSportForm({ ...sportForm, [e.target.name]: e.target.value });
  };

  const handleSportSubmit = async (e) => {
    e.preventDefault();
    setSportMessage("");
    try {
      await createSportAdmin(user.secret, sportForm);
      setSportMessage("Вид спорта создан");
      setSportForm({ name: "", icon: "", slug: "" });
      loadSports();
    } catch (err) {
      setSportMessage("Ошибка: " + err.message);
    }
  };

  const handleDeleteSport = async (sportId) => {
    if (!window.confirm("Удалить этот вид спорта?")) return;
    try {
      await deleteSportAdmin(user.secret, sportId);
      loadSports();
    } catch (err) {
      setSportMessage("Ошибка: " + err.message);
    }
  };

  const handleBanToggle = async (u) => {
    try {
      await banUser(user.secret, u.id, !u.is_banned);
      loadUsers();
    } catch (err) {
      setMessage("Ошибка: " + err.message);
    }
  };

  return (
    <div className="admin-page">
      <h1>Админка</h1>

      <h2>{editingEventId ? `Редактировать событие #${editingEventId}` : "Создать событие"}</h2>
      <form className="admin-page__form" onSubmit={handleSubmit}>
        <select
          className="admin-page__input"
          name="sport_slug"
          value={form.sport_slug}
          onChange={handleChange}
        >
          <option value="">Выберите вид спорта</option>
          {sports.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
        <input className="admin-page__input" name="league" placeholder="Лига" value={form.league} onChange={handleChange} />
        <input className="admin-page__input" name="home" placeholder="Хозяева" value={form.home} onChange={handleChange} />
        <input className="admin-page__input" name="away" placeholder="Гости" value={form.away} onChange={handleChange} />
        <input className="admin-page__input" name="starts_at" type="datetime-local" value={form.starts_at} onChange={handleChange} />
        <input className="admin-page__input" name="odd_p1" placeholder="Коэф П1" value={form.odd_p1} onChange={handleChange} />
        <input className="admin-page__input" name="odd_x" placeholder="Коэф X" value={form.odd_x} onChange={handleChange} />
        <input className="admin-page__input" name="odd_p2" placeholder="Коэф П2" value={form.odd_p2} onChange={handleChange} />
        <input className="admin-page__input" name="total_value" placeholder="Линия тотала" value={form.total_value} onChange={handleChange} />
        <input className="admin-page__input" name="odd_total_over" placeholder="Коэф тотал больше" value={form.odd_total_over} onChange={handleChange} />
        <input className="admin-page__input" name="odd_total_under" placeholder="Коэф тотал меньше" value={form.odd_total_under} onChange={handleChange} />
        <input className="admin-page__input" name="handicap_value" placeholder="Линия форы" value={form.handicap_value} onChange={handleChange} />
        <input className="admin-page__input" name="odd_handicap_home" placeholder="Коэф фора 1" value={form.odd_handicap_home} onChange={handleChange} />
        <input className="admin-page__input" name="odd_handicap_away" placeholder="Коэф фора 2" value={form.odd_handicap_away} onChange={handleChange} />
        <button className="admin-page__submit-btn" type="submit">
          {editingEventId ? "Сохранить" : "Создать"}
        </button>
        {editingEventId && (
          <button type="button" className="admin-page__finish-btn" onClick={handleCancelEdit}>
            Отменить редактирование
          </button>
        )}
      </form>
      {message && <p className="admin-page__message">{message}</p>}

      <h2>События</h2>
      <div className="admin-page__events">
        {events.map((ev) => (
          <div key={ev.id} className="admin-page__event">
            <div className="admin-page__event-title">
              #{ev.id} {ev.home} — {ev.away} ({ev.sport_slug}) — {ev.status}
              {(ev.home_score != null || ev.away_score != null) && (
                <strong> — {ev.home_score ?? 0}:{ev.away_score ?? 0}</strong>
              )}
            </div>
            <div className="admin-page__event-finish">
              <button className="admin-page__finish-btn" onClick={() => handleEditClick(ev)}>
                Редактировать
              </button>
              <button className="admin-page__finish-btn" onClick={() => handleDeleteEvent(ev.id)}>
                Удалить
              </button>
            </div>
            {ev.status !== "finished" && (
              <div className="admin-page__event-finish">
                <input
                  className="admin-page__score-input"
                  placeholder="Счёт хозяев"
                  onChange={(e) => handleScoreChange(ev.id, "home", e.target.value)}
                />
                <input
                  className="admin-page__score-input"
                  placeholder="Счёт гостей"
                  onChange={(e) => handleScoreChange(ev.id, "away", e.target.value)}
                />
                <button className="admin-page__finish-btn" onClick={() => handleUpdateScore(ev.id)}>
                  Обновить счёт
                </button>
                <button className="admin-page__finish-btn" onClick={() => handleFinish(ev.id)}>
                  Завершить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2>Создать вид спорта</h2>
      <form className="admin-page__form" onSubmit={handleSportSubmit}>
        <input className="admin-page__input" name="name" placeholder="Название (Футбол)" value={sportForm.name} onChange={handleSportChange} />
        <input className="admin-page__input" name="icon" placeholder="Иконка (⚽)" value={sportForm.icon} onChange={handleSportChange} />
        <input className="admin-page__input" name="slug" placeholder="slug (football)" value={sportForm.slug} onChange={handleSportChange} />
        <button className="admin-page__submit-btn" type="submit">
          Создать вид спорта
        </button>
      </form>
      {sportMessage && <p className="admin-page__message">{sportMessage}</p>}

      <div className="admin-page__events">
        {sports.map((s) => (
          <div key={s.id} className="admin-page__event">
            {s.icon} {s.name} ({s.slug})
            <button className="admin-page__finish-btn" onClick={() => handleDeleteSport(s.id)} style={{ marginLeft: 12 }}>
              Удалить
            </button>
          </div>
        ))}
      </div>

      <h2>Чаты поддержки</h2>
      <div className="admin-chat">
        <div className="admin-chat__threads">
          {chats.length === 0 && <p className="admin-page__message">Обращений пока нет</p>}
          {chats.map((c) => (
            <div
              key={c.user_id}
              className={`admin-chat__thread ${selectedChatUserId === c.user_id ? "admin-chat__thread--active" : ""}`}
              onClick={() => handleSelectChat(c.user_id)}
            >
              <div className="admin-chat__thread-login">{c.login}</div>
              <div className="admin-chat__thread-preview">
                {c.last_sender === "support" ? "Вы: " : ""}{c.last_text}
              </div>
            </div>
          ))}
        </div>
        <div className="admin-chat__dialog">
          {!selectedChatUserId ? (
            <p className="admin-page__message">Выберите диалог слева</p>
          ) : (
            <>
              <div className="admin-chat__messages">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`admin-chat__msg ${m.sender === "support" ? "admin-chat__msg--support" : ""}`}
                  >
                    <span className="admin-chat__msg-text">{m.text}</span>
                  </div>
                ))}
              </div>
              {chatError && <p className="admin-page__message">{chatError}</p>}
              <div className="admin-chat__reply-row">
                <input
                  className="admin-page__input"
                  placeholder="Ответить пользователю..."
                  value={chatReply}
                  onChange={(e) => setChatReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendReply(); }}
                />
                <button className="admin-page__finish-btn" onClick={handleSendReply}>
                  Отправить
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h2>Пользователи</h2>
      <div className="admin-page__events">
        {users.map((u) => (
          <div key={u.id} className="admin-page__event">
            #{u.id} {u.login} — баланс {u.balance} ₽ {u.is_admin && "· админ"}{" "}
            {u.is_banned && "· ЗАБАНЕН"}
            {!u.is_admin && (
              <button className="admin-page__finish-btn" onClick={() => handleBanToggle(u)} style={{ marginLeft: 12 }}>
                {u.is_banned ? "Разбанить" : "Забанить"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
