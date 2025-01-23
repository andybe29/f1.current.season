/* URL / URIs / YAML данных */
// базовый URL
const URL_F1DB = 'https://raw.githubusercontent.com/f1db/f1db/refs/heads/main/src/data';
// URI каталогов с yaml данных
const URI_CIRCUITS     = 'circuits';             // трассы
const URI_CONSTRUCTORS = 'constructors';         // конструкторы
const URI_DRIVERS      = 'drivers';              // пилоты
const URI_ENGINES      = 'engine-manufacturers'; // двигатели
const URI_GRANDS_PRIX  = 'grands-prix';          // Гран При
const URI_SEASONS      = 'seasons';              // сезоны
const URI_SEASON_RACES = 'races';                // этапы

/* названия yaml-файлов данных */
const YAML_CONSTRUCTORS = 'constructor-standings.yml'; // чемпионат конструкторов
const YAML_DRIVERS      = 'driver-standings.yml';      // чемпионат пилотов

const YAML_RACE              = 'race.yml';                           // информация об этапе

const YAML_QUALIFYING        = 'qualifying-results.yml'              // результаты квалификации
const YAML_GRID              = 'starting-grid-positions.yml';        // стартовая решётка
const YAML_RESULTS           = 'race-results.yml';                   // результаты гонки
const YAML_FLAPS             = 'fastest-laps.yml';                   // лучшие круги

const YAML_SPRINT_QUALIFYING = 'sprint-qualifying-results.yml'       // результаты квалификации спринта
const YAML_SPRINT_GRID       = 'sprint-starting-grid-positions.yml'; // стартовая решётка спринта
const YAML_SPRINT_RESULTS    = 'sprint-race-results.yml';            // результаты  спринта

/* текущий сезон */
const SEASON = 2024;

/* этапы */
const RACES  = [
    'bahrain',
    'saudi-arabia',
    'australia',
    'japan',
    'china',
    'miami',
    'emilia-romagna',
    'monaco',
    'canada',
    'spain',
    'austria',
    'great-britain',
    'hungary',
    'belgium',
    'netherlands',
    'italy',
    'azerbaijan',
    'singapore',
    'united-states',
    'mexico',
    'sao-paulo',
    'las-vegas',
    'qatar',
    'abu-dhabi',
];

const _dateTime2UTC = function(date, time) {
    return Date.length ? Date.parse(date + (time.length ? (' ' + time) : '')) : NaN;
}

/* Трасса */
class Circuit {
}

/* Конструктор */
class Constructor {
}

/* Пилот */
class Driver {
}

/* Двигатель */
class Engine {
}

/* Гран При */
class GrandPrix {
}

/* Этап */
class Race {
    id;          // id гонки в f1db
    round;       // этап чемпионата
    schedule;    // расписание этапа
    grandPrixId; // id Гран При
    circuitId;   // id трассы
    laps;        // кол-во кругов
    distance;    // дистанция гонки

    constructor() {
        Object.keys(this).forEach(key => this[key] = null);
    }

    parse(rows) {
        let curr = Object.create(null);

        rows.forEach(row => {
            if (row.length > 0) {
                row = row.split(':');
                curr[row.shift()] = row.map(value => value.trim()).join(':');
            }
        });

        this.id          = Number.parseInt(curr?.id, 10) || null;
        this.round       = Number.parseInt(curr?.round, 10) || null;
        this.grandPrixId = curr?.grandPrixId || null;
        this.circuitId   = curr?.circuitId || null;
        this.laps        = Number.parseInt(curr?.laps, 10) || null;
        this.distance    = Number.parseFloat(curr?.distance) || null;

        this.schedule = Object.create(null);
        this.schedule.qualifying = _dateTime2UTC(curr?.qualifyingDate || '', curr?.qualifyingTime || '');
        this.schedule.race       = _dateTime2UTC(curr?.date || '', curr?.time || '');
        this.schedule.sprintQualifying = _dateTime2UTC(curr?.sprintQualifyingDate || '', curr?.sprintQualifyingTime || '');
        this.schedule.sprintRace       = _dateTime2UTC(curr?.sprintRaceDate || '', curr?.sprintRaceTime || '');
    }
}

const Races        = new Map();
const Circuits     = new Map();
const Constructors = new Map();
const Drivers      = new Map();
const Engines      = new Map();
const GrandsPrix   = new Map();

// запросы календаря этапов

(function () {
    if (Races.size) return;

    document.querySelector('#races').hidden = true;

    let url  = [URL_F1DB, URI_SEASONS, SEASON, URI_SEASON_RACES];
    let URLs = [];

    RACES.forEach((grandPrixId, i) => {
        Races.set(grandPrixId, null);

        let currURL = [...url];
        currURL.push((i + 1).toString().padStart(2, '0') + '-' + grandPrixId);
        currURL.push(YAML_RACE);

        URLs.push(currURL.join('/'));
    });

    Promise.all(
        URLs.map((url) => fetch(url).then(response => response.text()))
    ).then((data) => {
        data.forEach(value => {
            let rows = value.split(/\r?\n/);

            if (rows.length > 1) {
                let race = new Race();
                race.parse(rows);

                if (race.grandPrixId) {
                    Races.set(race.grandPrixId, race);
                }
            }
        });

        renderRaces();
    });

})();

function renderRaces() {
    const RTABLE = document.querySelector('#races');
    const RTBODY = RTABLE.querySelector('tbody');
    const RTMPL  = document.querySelector('#races-row');

    const dateOptions = {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
    };
    const timeOptions = {
        hour:   'numeric',
        minute: 'numeric',
        hour12: false,
    };

    RTBODY.textContent = '';

    function renderRace(value, grandPrixId) {
        let tr = document.importNode(RTMPL.content, true);
        let td = tr.querySelectorAll('td');
        let race = Races.get(grandPrixId);
        let evnt = new Date(race.schedule.race - 60 * 1000 * (new Date).getTimezoneOffset());

        td[0].textContent = race.round;
        td[1].textContent = evnt.toLocaleDateString('en-US', dateOptions);
        td[2].textContent = evnt.toLocaleTimeString('en-US', timeOptions);
        td[3].textContent = race.grandPrixId;

        RTBODY.appendChild(tr);
        RTBODY.lastElementChild.setAttribute('data-grandprixid', grandPrixId);
    }

    Races.forEach(renderRace);
    RTABLE.hidden = false;
}