import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found__code">404</div>
      <h1 className="not-found__title">Страница не найдена</h1>
      <p className="not-found__text">
        Такой страницы не существует — возможно, адрес введён с ошибкой или
        страница была удалена.
      </p>
      <Link to="/" className="not-found__link">
        На главную
      </Link>
    </div>
  );
}
