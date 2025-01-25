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
const YAML_CONSTRUCTORS      = 'constructor-standings.yml';          // чемпионат конструкторов
const YAML_DRIVERS           = 'driver-standings.yml';               // чемпионат пилотов
const YAML_ENTRANTS          = 'entrants.yml';                       // список участников

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
    /*
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
    */
];

const _dateTime2UTC = (date, time) => Date.length ? Date.parse(date + (time.length ? (' ' + time) : '')) : NaN;
const _race2URI     = (round, grandPrixId) => [round.toString().padStart(2, '0'), grandPrixId].join('-');

const _parseSimpleYAML = (data) => {
    let tempObject = Object.create(null);

    data = data.split(/\r?\n/);

    data.forEach(row => {
        if (row.length > 0) {
            row = row.split(':');
            tempObject[row.shift()] = row.map(value => value.trim()).join(':');
        }
    });

    return tempObject;
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

/* Участник */
class Entrant {
}

/* Гран При */
class GrandPrix {
    id; // id Гран При
    name;
    fullName;

    constructor() {
        Object.keys(this).forEach(key => this[key] = null);
    }

    // присвоение значений
    update(data) {
        Object.keys(this).forEach(key => this[key] = (key in data) ? data[key] : null);
    }
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

    circuit() {
    }

    grandPrix() {
        return this.grandPrixId ? GrandsPrix.get(this.grandPrixId) : null;
    }

    // присвоение значений
    update(data) {
        this.id          = Number.parseInt(data?.id, 10) || null;
        this.round       = Number.parseInt(data?.round, 10) || null;
        this.grandPrixId = data?.grandPrixId || null;
        this.circuitId   = data?.circuitId || null;
        this.laps        = Number.parseInt(data?.laps, 10) || null;
        this.distance    = Number.parseFloat(data?.distance) || null;

        this.schedule = Object.create(null);
        this.schedule.qualifying = _dateTime2UTC(data?.qualifyingDate || '', data?.qualifyingTime || '');
        this.schedule.race       = _dateTime2UTC(data?.date || '', data?.time || '');
        this.schedule.sprintQualifying = _dateTime2UTC(data?.sprintQualifyingDate || '', data?.sprintQualifyingTime || '');
        this.schedule.sprintRace       = _dateTime2UTC(data?.sprintRaceDate || '', data?.sprintRaceTime || '');
    }
}

const Circuits     = new Map();
const Constructors = new Map();
const Drivers      = new Map();
const Engines      = new Map();
const Entrants     = new Map();
const GrandsPrix   = new Map();
const Races        = new Map();

/* Вывод календаря этапов */
const RTABLE = document.querySelector('#races');
const RTBODY = RTABLE.querySelector('tbody');
const RTMPL  = document.querySelector('#races-template');

(function () {

    RACES.forEach((grandPrixId, i) => {
        // предварительное заполнение наборов данных
        Races.set(grandPrixId, null);
        GrandsPrix.set(grandPrixId, null);

        let round = i + 1;

        let tr = document.importNode(RTMPL.content, true);
        let td = tr.querySelectorAll('td');

        td[0].textContent = round;

        let a  = td[3].querySelector('a');
        a.href        = _race2URI(round, grandPrixId);
        a.textContent = grandPrixId;
        a.addEventListener('click', (e) => {
            event.preventDefault();
            let grandPrixId = e.target.parentNode.parentNode.dataset.id;
            console.log(grandPrixId);
        });

        RTBODY.appendChild(tr);
        RTBODY.lastElementChild.setAttribute('data-id', grandPrixId);
    });

    RTABLE.hidden = false;

})();

/* Импорт этапов и Гран При */
(function () {
    let url  = [URL_F1DB, URI_SEASONS, SEASON, URI_SEASON_RACES];
    let URLs = [];

    RACES.forEach((grandPrixId, i) => {
        // календарь этапов
        let currURL = [...url];
        let round = i + 1;

        currURL.push(_race2URI(round, grandPrixId));
        currURL.push(YAML_RACE);

        URLs.push(currURL.join('/'));
        URLs.push([URL_F1DB, URI_GRANDS_PRIX, grandPrixId + '.yml'].join('/'));
    });

    Promise.all(
        URLs.map((url) => fetch(url).then(response => response.text()))
    ).then((data) => {

        data.forEach((content) => {
            if (content.length > 1) {
                let parsedData = _parseSimpleYAML(content);

                if ('grandPrixId' in parsedData) {
                    // этап
                    let race = new Race();
                    race.update(parsedData);

                    if (race.grandPrixId) {
                        Races.set(race.grandPrixId, race);
                    }
                } else {
                    // Гран При
                    let grandPrix = new GrandPrix();
                    grandPrix.update(parsedData);

                    if (grandPrix.id) {
                        GrandsPrix.set(grandPrix.id, grandPrix);
                    }
                }
            }
        });

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

        function renderRace(value, grandPrixId) {
            let race = Races.get(grandPrixId);
            let evnt = new Date(race.schedule.race - 60 * 1000 * (new Date).getTimezoneOffset());

            let tr = document.querySelector('[data-id="' + grandPrixId + '"]');
            let td = tr.querySelectorAll('td');

            td[1].textContent = evnt.toLocaleDateString('en-US', dateOptions);
            td[2].textContent = evnt.toLocaleTimeString('en-US', timeOptions);
            td[3].querySelector('a').textContent = GrandsPrix.get(race.grandPrixId).name;
        }

        Races.forEach(renderRace);
    });

})();
