const BASE_URL = "http://127.0.0.1:8000"

async function request(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Ошибка сервера" }))
    if (typeof err.detail === 'string') throw new Error(err.detail)
    if (Array.isArray(err.detail)) {
      const msg = err.detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join('; ')
      throw new Error(msg)
    }
    throw new Error(JSON.stringify(err))
  }
  return res.json()
}

export const register = (login, password) =>
  request("/users", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  })

export const getUser = (userId) => request(`/users/${userId}`)

export const patchBalance = (userId, amount) =>
  request(`/users/${userId}/balance`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  })

export const createSession = (login, password) =>
  request("/sessions", {
    method: "POST",
    headers: { login, password },
  })

export const deleteSession = (secret) =>
  request("/sessions", {
    method: "DELETE",
    headers: { "session-secret": secret },
  })

export const getEvents = (sportSlug = null) =>
  request(sportSlug ? `/events?sport_slug=${sportSlug}` : "/events")

export const createBet = (userId, secret, eventId, outcome, amount) => {
  const payload = {
    event_id: parseInt(eventId),
    outcome: String(outcome),
    amount: parseFloat(amount),
  }
  console.log('createBet →', payload)
  return request(`/users/${userId}/bets`, {
    method: "POST",
    headers: { "session-secret": secret },
    body: JSON.stringify(payload),
  })
}

export const getUserBets = (userId, secret) =>
  request(`/users/${userId}/bets`, {
    headers: { "session-secret": secret },
  })