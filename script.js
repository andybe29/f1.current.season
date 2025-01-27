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
const YAML_CONSTRUCTOR_STANDINGS = 'constructor-standings.yml';      // чемпионат конструкторов
const YAML_DRIVER_STANDINGS      = 'driver-standings.yml';           // чемпионат пилотов
const YAML_ENTRANTS              = 'entrants.yml';                   // список участников

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
    /*
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

const _dateTime2UTC  = (date, time) => Date.length ? Date.parse(date + (time.length ? (' ' + time) : '')) : NaN;
const _race2URI      = (round, grandPrixId) => [round.toString().padStart(2, '0'), grandPrixId].join('-');

const _line2KeyValue = (line) => {
    if ('string' != typeof line || line.indexOf(':') < 0) {
        return ['', ''];
    } else {
        line = line.split(':');

        let key   = line.shift().replace(/\-/, '').trim();
        let value = line.map(value => value.trim()).join(':');

        return [key, value];
    }
}

const _parseSimpleYAML = (data) => {
    let tempObject = Object.create(null);

    data = data.split(/\r?\n/);

    data.forEach(line => {
        if (line.length > 0) {
            let [key, value] = _line2KeyValue(line);
            tempObject[key] = value;
        }
    });

    return tempObject;
}

const RTABLE = document.querySelector('#races');

/* Конструктор */
class Constructor {
}

/* Положение в Чемпионате конструкторов */
class ConstructorStanding {
    position;
    constructorId;
    engineId;
    points;

    constructor() {
        Object.keys(this).forEach(key => this[key] = null);
    }

    // присвоение значений
    update(data) {
        this.position      = parseInt(data?.position, 10) || null;
        this.constructorId = data?.constructorId || null;
        this.engineId      = data?.engineId || null;
        this.points        = parseInt(data?.points, 10) || null;
    }
}

/* Пилот */
class Driver {
}

/* Положение в Чемпионате пилотов */
class DriverStanding {
    position;
    driverId;
    points;

    constructor() {
        Object.keys(this).forEach(key => this[key] = null);
    }

    // присвоение значений
    update(data) {
        this.position = parseInt(data?.position, 10) || null;
        this.driverId = data?.driverId || null;
        this.points   = parseInt(data?.points, 10) || null;
    }
}

/* Двигатель */
class Engine {
}

/* Участник */
class Entrant {
    id; // entrantId
    constructorId;
    engineId; // engineManufacturerId
    drivers; // набор driverId

    constructor() {
        Object.keys(this).forEach(key => this[key] = ('drivers' === key) ? [] : null);
    }

    // присвоение значений
    update(data) {
        Object.keys(this).forEach(key => this[key] = (key in data) ? data[key] : null);
    }
}

/* Гран При */
class GrandPrix {
    id;
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

const Constructors          = new Map();
const ConstructorStandings  = new Map();
const Drivers               = new Map();
const DriverStandings       = new Map();
const Engines               = new Map();
const Entrants              = new Map();
const GrandsPrix            = new Map();
const Races                 = new Map();

/* Импорт положений в чемпионате конструкторов */
(function () {
    const url = [URL_F1DB, URI_SEASONS, SEASON, YAML_CONSTRUCTOR_STANDINGS].join('/');

    fetch(url).then(function(response) {
        if (response.ok) {
            return Promise.resolve(response);
        } else {
            console.log(response.status, response.statusText);
            return Promise.reject(new Error(response.status));
        }
    }).then(response => response.text())
    .then(data => {
        data = data.split(/\r?\n/);

        for (i = 0; i < data.length; i = i + 4) {
            let tempObject = new Object(null);

            [key, tempObject.position]      = _line2KeyValue(data[i]);
            [key, tempObject.constructorId] = _line2KeyValue(data[i + 1]);
            [key, tempObject.engineId]      = _line2KeyValue(data[i + 2]);
            [key, tempObject.points]        = _line2KeyValue(data[i + 3]);

            let standing = new ConstructorStanding();
            standing.update(tempObject);

            ConstructorStandings.set(standing.constructorId, standing);
        }
    });

})();

/* Импорт положений в чемпионате пилотов */
(function () {
    const url = [URL_F1DB, URI_SEASONS, SEASON, YAML_DRIVER_STANDINGS].join('/');

    fetch(url).then(function(response) {
        if (response.ok) {
            return Promise.resolve(response);
        } else {
            console.log(response.status, response.statusText);
            return Promise.reject(new Error(response.status));
        }
    }).then(response => response.text())
    .then(data => {
        data = data.split(/\r?\n/);

        for (i = 0; i < data.length; i = i + 3) {
            let tempObject = new Object(null);

            [key, tempObject.position] = _line2KeyValue(data[i]);
            [key, tempObject.driverId] = _line2KeyValue(data[i + 1]);
            [key, tempObject.points]   = _line2KeyValue(data[i + 2]);

            let standing = new DriverStanding();
            standing.update(tempObject);

            DriverStandings.set(standing.driverId, standing);
        }
    });

})();

/* Импорт участников */
(function () {
    const url = [URL_F1DB, URI_SEASONS, SEASON, YAML_ENTRANTS].join('/');

    fetch(url).then(function(response) {
        if (response.ok) {
            return Promise.resolve(response);
        } else {
            console.log(response.status, response.statusText);
            return Promise.reject(new Error(response.status));
        }
    }).then(response => response.text())
    .then(data => {
        data = data.split(/\r?\n/);

        let entrant = new Entrant();

        for (i = 0; i < data.length; i ++) {
            let [key, value] = _line2KeyValue(data[i]);

            if ('entrantId' === key && null != entrant.id) {
                Entrants.set(entrant.id, entrant);

                entrant = new Entrant();
            }

            switch (key) {
                case 'entrantId': {
                    entrant.id = value;
                    break;
                }

                case 'constructorId': {
                    entrant.constructorId = value;
                    Constructors.set(value, null);
                    break;
                }

                case 'engineManufacturerId': {
                    entrant.engineId = value;
                    Engines.set(value, null);
                    break;
                }

                case 'driverId': {
                    entrant.drivers.push(value);
                    break;
                }
            }
        }

        Entrants.set(entrant.id, entrant);

        console.log(Entrants);
    });

})();

/* Вывод календаря этапов */
/* Импорт этапов и Гран При */
(function () {
    const RTBODY = RTABLE.querySelector('tbody');
    const RTMPL  = document.querySelector('#races-template');

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
        URLs.map(url => fetch(url).then(response => response.text()))
    ).then(data => {

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

            if (null != race) {
                let evnt = new Date(race.schedule.race - 60 * 1000 * (new Date).getTimezoneOffset());

                let tr = document.querySelector('[data-id="' + grandPrixId + '"]');
                let td = tr.querySelectorAll('td');

                td[1].textContent = evnt.toLocaleDateString('en-US', dateOptions);
                td[2].textContent = evnt.toLocaleTimeString('en-US', timeOptions);
                td[3].querySelector('a').textContent = GrandsPrix.get(race.grandPrixId).name;
            }
        }

        Races.forEach(renderRace);

        RTABLE.hidden = false;
    }).catch(error => console.log(error));

})();
