# F1 Current Season

## http://andy.bezbozhny.com/f1.current.season

## Single Page Application

На основной (стартовой) странице:
- **Calendar**: календарь гонок
- **Entries**: список участников (конструкторы и пилоты)
- **World Drivers' Championship**: положение в чемпионате пилотов
- **World Constructors' Championship**: положение в чемпионате конструкторов

По клику на ссылку Гран При загружается страница с результатами:
- **Qualifyng Results**: результаты квалификации
- **Race Results**: результаты гонки
- В случае, если Гран При со спринтом, загружаются **Sprint Qualifyng Results** и **Sprint Results** в аналогичном виде

## Используемый стек

- **HTML + CSS**: [Spectre.css](https://picturepan2.github.io/spectre/), a Lightweight, Responsive and Modern CSS Framework
- **Data**: [f1db](https://github.com/f1db/f1db), Open Source Formula 1 Database. Данные в источнике хранятся в виде YAML-файлов. После импорта и парсинга данные сохраняются в памяти в виде набора Map-коллекций (в будущих версиях возможно сохранения части данных в localStorage)
- **JavaScript**: чистый JavaScript без сторонних библиотек, фреймворков и т.д. Используемые API: **Fetch**, **Promise**, **History**
