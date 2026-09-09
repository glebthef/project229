const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

async function request(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Ошибка сервера" }))
    if (err.detail === "Account banned") {
      // Backend rejects this on every authenticated request once a user is
      // banned, even with an already-issued session-secret — force them out
      // client-side too, instead of leaving a "still logged in" UI that just
      // silently fails on every action.
      localStorage.removeItem('user')
      localStorage.removeItem('betsHistory')
      window.location.href = '/'
      throw new Error('Аккаунт заблокирован')
    }
    if (typeof err.detail === 'string') throw new Error(err.detail)
    if (Array.isArray(err.detail)) {
      throw new Error(err.detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join('; '))
    }
    throw new Error("Ошибка сервера")
  }
  return res.json()
}

export const register = (login, password) =>
  request("/users", { method: "POST", body: JSON.stringify({ login, password }) })

export const getUser = (userId) => request(`/users/${userId}`)

export const patchBalance = (userId, secret, amount) =>
  request(`/users/${userId}/balance`, {
    method: "PATCH",
    headers: { "session-secret": secret },
    body: JSON.stringify({ amount }),
  })

export const createSession = (login, password) =>
  request("/sessions", { method: "POST", headers: { login, password } })

export const deleteSession = (secret) =>
  request("/sessions", { method: "DELETE", headers: { "session-secret": secret } })

export const getEvents = (sportSlug = null) =>
  request(sportSlug ? `/events?sport_slug=${sportSlug}` : "/events")


export const createSingleBet = (userId, secret, eventId, outcome, amount) =>
  request(`/users/${userId}/bets/single`, {
    method: "POST",
    headers: { "session-secret": secret },
    body: JSON.stringify({
      event_id: parseInt(eventId),
      outcome: String(outcome),
      amount: parseFloat(amount),
    }),
  })


export const createExpressBet = (userId, secret, legs, amount) =>
  request(`/users/${userId}/bets/express`, {
    method: "POST",
    headers: { "session-secret": secret },
    body: JSON.stringify({
      amount: parseFloat(amount),
      legs: legs.map(l => ({
        event_id: parseInt(l.event_id),
        outcome: String(l.outcome),
      })),
    }),
  })

export const getUserBets = (userId, secret) =>
  request(`/users/${userId}/bets`, { headers: { "session-secret": secret } })

export const getSports = ()=>
  request("/sports")

export const createEventAdmin = (secret, data)=>
  request("/events", {method: "POST",
                      headers: {"session-secret": secret},
                      body: JSON.stringify(data)


  })

  export const finishEvent = (secret, eventId, homeScore, awayScore) =>
    request(`/events/${eventId}/finish`,
      {
          method: "POST",
          headers: {"session-secret":secret},
          body: JSON.stringify({
            home_score: homeScore,
            away_score: awayScore
          })

      }
    )

    export const createSportAdmin = (secret, data) =>
      request("/sports", {method: "POST",
                          headers:{"session-secret": secret},
                          body: JSON.stringify(data)
      })
    export const getAllUsers = (secret) => request("/users", { headers: { "session-secret": secret } })

export const updateEventAdmin = (secret, eventId, data) =>
  request(`/events/${eventId}`, {
    method: "PUT",
    headers: { "session-secret": secret },
    body: JSON.stringify(data),
  })

export const deleteEventAdmin = (secret, eventId) =>
  request(`/events/${eventId}`, {
    method: "DELETE",
    headers: { "session-secret": secret },
  })

export const deleteSportAdmin = (secret, sportId) =>
  request(`/sports/${sportId}`, {
    method: "DELETE",
    headers: { "session-secret": secret },
  })

export const banUser = (secret, userId, banned) =>
  request(`/users/${userId}/ban`, {
    method: "PATCH",
    headers: { "session-secret": secret },
    body: JSON.stringify({ banned }),
  })

export const updateLiveScore = (secret, eventId, homeScore, awayScore) =>
  request(`/events/${eventId}/score`, {
    method: "PATCH",
    headers: { "session-secret": secret },
    body: JSON.stringify({ home_score: homeScore, away_score: awayScore }),
  })

export const getChatMessages = (userId, secret) =>
  request(`/users/${userId}/chat`, { headers: { "session-secret": secret } })

export const sendChatMessage = (userId, secret, text) =>
  request(`/users/${userId}/chat`, {
    method: "POST",
    headers: { "session-secret": secret },
    body: JSON.stringify({ text }),
  })

export const getAllChatsAdmin = (secret) =>
  request("/chats", { headers: { "session-secret": secret } })