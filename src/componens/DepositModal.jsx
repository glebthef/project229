import { useState } from "react";
import { useAuth } from "../AuthContext";
import { createDeposit } from "../api";

const AMOUNTS = [500, 1000, 2000, 5000, 10000];
// Единственный способ пополнения — Stripe в тестовом режиме: баланс
// зачисляет только бэкенд, после того как Stripe подтвердил оплату
// (см. Profile.jsx и routes/payments.py).
const METHODS = [
  {
    id: "stripe",
    name: "Оплата картой",
    icon: "🧪",
    desc: "Тестовый платёж (Stripe)",
    min: 50,
  },
];

export default function DepositModal({ onClose }) {
  const { user } = useAuth();
  const [method, setMethod] = useState("stripe");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("choose");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedMethod = METHODS.find((m) => m.id === method);

  const handleNext = () => {
    if (!method) {
      setError("Выберите способ оплаты");
      return;
    }
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("Введите сумму");
      return;
    }
    if (selectedMethod && num < selectedMethod.min) {
      setError(`Минимальная сумма: ${selectedMethod.min} ₽`);
      return;
    }
    setError("");
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const num = parseFloat(amount);
    setLoading(true);
    setError("");
    try {
      const returnUrl = `${window.location.origin}/profile`;
      const { payment_id, confirmation_url } = await createDeposit(
        user.id,
        user.secret,
        num,
        returnUrl,
      );
      localStorage.setItem("pendingDepositId", payment_id);
      window.location.href = confirmation_url;
    } catch (e) {
      setError(e.message || "Ошибка при пополнении");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal deposit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="auth-modal__close" onClick={onClose}>
          ✕
        </button>

        {step === "choose" && (
          <>
            <div className="auth-modal__logo">Пополнение счёта</div>
            <div className="deposit__methods">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`deposit__method ${method === m.id ? "deposit__method--active" : ""}`}
                  onClick={() => {
                    setMethod(m.id);
                    setError("");
                  }}
                >
                  <span className="deposit__method-icon">{m.icon}</span>
                  <div className="deposit__method-info">
                    <span className="deposit__method-name">{m.name}</span>
                    <span className="deposit__method-desc">{m.desc}</span>
                  </div>
                  {method === m.id && (
                    <span className="deposit__method-check">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div className="deposit__amounts">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  className={`deposit__amount-btn ${amount === String(a) ? "deposit__amount-btn--active" : ""}`}
                  onClick={() => {
                    setAmount(String(a));
                    setError("");
                  }}
                >
                  {a} ₽
                </button>
              ))}
            </div>
            <div className="coupon__stake-row">
              <input
                className="coupon__stake-input auth-modal__input"
                type="number"
                placeholder="Другая сумма"
                value={amount}
                min="1"
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
              />
              <span className="coupon__currency">₽</span>
            </div>
            {error && <div className="auth-modal__error">{error}</div>}
            <button className="auth-modal__submit" onClick={handleNext}>
              Продолжить
            </button>
            <div className="deposit__note">🔒 Платёж защищён шифрованием.</div>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="auth-modal__logo">Подтверждение</div>
            <div className="deposit__summary">
              <div className="deposit__summary-row">
                <span>Способ оплаты</span>
                <span>
                  {selectedMethod?.icon} {selectedMethod?.name}
                </span>
              </div>
              <div className="deposit__summary-row deposit__summary-row--total">
                <span>Сумма</span>
                <span className="deposit__summary-amount">
                  {parseFloat(amount).toLocaleString()} ₽
                </span>
              </div>
            </div>
            {error && <div className="auth-modal__error">{error}</div>}
            <button
              className="auth-modal__submit"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading
                ? "Переход к оплате..."
                : `Пополнить ${parseFloat(amount).toLocaleString()} ₽`}
            </button>
            <button
              className="deposit__back-btn"
              onClick={() => setStep("choose")}
            >
              ← Назад
            </button>
          </>
        )}
      </div>
    </div>
  );
}
