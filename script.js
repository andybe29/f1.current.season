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

const YAML_RACE_QUALIFYING   = 'qualifying-results.yml'              // результаты квалификации
const YAML_RACE_GRID         = 'starting-grid-positions.yml';        // стартовая решётка
const YAML_RACE_RESULTS      = 'race-results.yml';                   // результаты гонки
const YAML_RACE_FLAPS        = 'fastest-laps.yml';                   // лучшие круги

const YAML_SPRINT_QUALIFYING = 'sprint-qualifying-results.yml'       // результаты квалификации спринта
const YAML_SPRINT_GRID       = 'sprint-starting-grid-positions.yml'; // стартовая решётка спринта
const YAML_SPRINT_RESULTS    = 'sprint-race-results.yml';            // результаты  спринта

/* текущий сезон */
const CURRENT_SEASON = 2024;

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

const _dateTime2UTC  = (date, time) => Date.length ? Date.parse(date + (time.length ? (' ' + time) : '')) : NaN;
const _race2URI      = (round, grandPrixId) => [round.toString().padStart(2, '0'), grandPrixId].join('-');

const _line2KeyValue = line => {
    if ('string' === typeof line && line.includes(':')) {
        line = line.split(':');

        let key   = line.shift().replace(/\-/, '').trim();
        let value = line.map(value => value.trim()).join(':');

        return [key, value];
    } else {
        return ['', ''];
    }
}

const CTABLE = document.querySelector('#constructors');
const ETABLE = document.querySelector('#entrants');
const RTABLE = document.querySelector('#races');

/* Конструктор */
class Constructor {
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
        let circuit = this.circuitId ? Circuits.get(this.circuitId) : null;
        return circuit || null;
    }

    grandPrix() {
        let grandPrix = this.grandPrixId ? GrandsPrix.get(this.grandPrixId) : null;
        return grandPrix || null;
    }

    // присвоение значений
    update(data) {
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
const Drivers               = new Map();
const Engines               = new Map();
const GrandsPrix            = new Map();
const Races                 = new Map();

const DriverStandings       = [];

/* Импорт и вывод положений в чемпионате конструкторов */
(function () {
    const url = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, YAML_CONSTRUCTOR_STANDINGS].join('/');

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

        // положение в Чемпионате конструкторов
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

        let Standings = [];
        let length    = data.length - 1;

        for (i = 0; i < length; i += 4) {
            let tempObject = new Object(null);

            [key, tempObject.position]      = _line2KeyValue(data[i]);
            [key, tempObject.constructorId] = _line2KeyValue(data[i + 1]);
            [key, tempObject.engineId]      = _line2KeyValue(data[i + 2]);
            [key, tempObject.points]        = _line2KeyValue(data[i + 3]);

            let standing = new ConstructorStanding();
            standing.update(tempObject);

            Standings.push(standing);
        }

        // сортировка по position
        Standings = Standings.sort((a, b) => a.position - b.position);

        // предварительный вывод положений в чемпионате конструкторов
        const CTBODY = CTABLE.querySelector('tbody');
        const STMPL  = document.querySelector('#standings-template');

        Standings.forEach(standing => {
            if (null == standing) return;

            let tr = document.importNode(STMPL.content, true);
            let td = tr.querySelectorAll('td');

            td[0].textContent = standing.position;

            let innerHTML = [];

            innerHTML.push('<span data-constructor="' + standing.constructorId + '">');
            innerHTML.push(standing.constructorId);
            innerHTML.push('</span>');

            if (standing.constructorId != standing.engineId) {
                innerHTML.push(' ');
                innerHTML.push('<span data-engine="' + standing.engineId + '">');
                innerHTML.push(standing.engineId);
                innerHTML.push('</span>');
            }

            td[1].innerHTML   = innerHTML.join('');
            td[2].textContent = standing.points;

            CTBODY.appendChild(tr);
        });

        CTABLE.hidden = false;
    });

})();

/* Импорт положений в чемпионате пилотов (DriverStandings) */
(function () {
    const url = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, YAML_DRIVER_STANDINGS].join('/');

    fetch(url).then(function(response) {
        if (response.ok) {
            return Promise.resolve(response);
        } else {
            console.log(response.status, response.statusText);
            return Promise.reject(new Error(response.status));
        }
    }).then(response => response.text())
    .then(data => {
        let Standings = [];

        data = data.split(/\r?\n/);

        for (i = 0; i < data.length; i = i + 3) {
            let tempObject = new Object(null);

            [key, tempObject.position] = _line2KeyValue(data[i]);
            [key, tempObject.driverId] = _line2KeyValue(data[i + 1]);
            [key, tempObject.points]   = _line2KeyValue(data[i + 2]);

            let standing = new DriverStanding();
            standing.update(tempObject);

            Standings.push(standing);
        }
    });

})();

/* Импорт и вывод участников */
(function () {
    const url = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, YAML_ENTRANTS].join('/');

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

        // участник
        class Entrant {
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

        let Entrants = [];
        let entrant = new Entrant();

        for (i = 0; i < data.length; i ++) {
            let [key, value] = _line2KeyValue(data[i]);

            switch (key) {
                case 'constructorId': {
                    if (null !== entrant.constructorId) {
                        // участник из предыдущего цикла
                        Entrants.push(entrant);
                    }

                    // новый участник
                    entrant = new Entrant();
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
                    let [key1, value1] = _line2KeyValue(data[i + 1]); // rounds
                    let [key2, value2] = _line2KeyValue(data[i + 2]); // testDriver?

                    if ((0 == value1.length) && ('testDriver' == key2)) {
                        // у данного участника данный пилот числится только тест-пилотом
                    } else {
                        entrant.drivers.push(value);
                        Drivers.set(value, null);
                    }
                    break;
                }
            }
        }

        // сортировка по constructorId
        Entrants.push(entrant);
        Entrants = Entrants.sort((a, b) => a.constructorId - b.constructorId);

        // предварительный вывод участников
        const ETBODY  = ETABLE.querySelector('tbody');
        const ECTMPL  = document.querySelector('#entrants-constructor-template');
        const ECETMPL = document.querySelector('#entrants-constructor-engine-template');
        const EDTMPL  = document.querySelector('#entrants-driver-template');

        Entrants.forEach(entrant => {
            if (null == entrant) return;

            let tr, td;

            // constructor & engine
            if (entrant.constructorId == entrant.engineId) {
                tr = document.importNode(ECTMPL.content, true);
                td = tr.querySelectorAll('td');
            } else {
                tr = document.importNode(ECETMPL.content, true);
                td = tr.querySelectorAll('td');

                td[1].textContent = entrant.engineId;
                td[1].setAttribute('data-engine', entrant.engineId);
            }

            td[0].textContent = entrant.constructorId;
            td[0].setAttribute('data-constructor', entrant.constructorId);

            ETBODY.appendChild(tr);

            // пилоты
            entrant.drivers.forEach((driver, i) => {
                tr = document.importNode(EDTMPL.content, true);
                td = tr.querySelectorAll('td');

                td[1].textContent = driver;
                td[1].setAttribute('data-driver', driver);

                ETBODY.appendChild(tr);
            });
        });

        ETABLE.hidden = false;
    });

})();

/* Вывод Calendar */
/* Импорт этапов (Races) и Гран При (GrandsPrix)*/
(function () {
    const RTBODY = RTABLE.querySelector('tbody');
    const RTMPL  = document.querySelector('#races-template');

    RACES.forEach((grandPrixId, i) => {
        // предварительное заполнение наборов данных
        Races.set(grandPrixId, null);
        GrandsPrix.set(grandPrixId, null);

        // предварительный вывод Calendar
        let round = i + 1;

        let tr = document.importNode(RTMPL.content, true);
        let td = tr.querySelectorAll('td');

        td[0].textContent = round;

        let a  = td[3].querySelector('a');
        a.href        = _race2URI(round, grandPrixId);
        a.textContent = grandPrixId;
        a.addEventListener('click', e => {
            event.preventDefault();
            let grandPrixId = e.target.closest('tr').dataset.id;
            console.log(grandPrixId);
        });

        RTBODY.appendChild(tr);
        RTBODY.lastElementChild.setAttribute('data-id', grandPrixId);
    });

    let url  = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, URI_SEASON_RACES];
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

        data.forEach(content => {
            if (content.length > 1) {
                let tempObject = Object.create(null);

                content = content.split(/\r?\n/);

                content.forEach(line => {
                    let [key, value] = _line2KeyValue(line);
                    tempObject[key] = value;
                });

                if ('grandPrixId' in tempObject) {
                    // этап
                    let race = new Race();
                    race.update(tempObject);

                    if (race.grandPrixId) {
                        Races.set(race.grandPrixId, race);
                    }
                } else {
                    // Гран При
                    let grandPrix = new GrandPrix();
                    grandPrix.update(tempObject);

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

        /* Заполнение Calendar */
        Races.forEach(race => {
            if (null == race) return;

            let evnt = new Date(race.schedule.race - 60 * 1000 * (new Date).getTimezoneOffset());

            let tr = document.querySelector('[data-id="' + race.grandPrixId + '"]');
            let td = tr.querySelectorAll('td');

            td[1].textContent = evnt.toLocaleDateString('en-US', dateOptions);
            td[2].textContent = evnt.toLocaleTimeString('en-US', timeOptions);
            td[3].querySelector('a').textContent = race.grandPrix()?.name || race.grandPrixId;
        });

        RTABLE.hidden = false;
    }).catch(error => console.log(error));

})();
