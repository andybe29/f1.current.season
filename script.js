'use strict'
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

const YAMLS_RACE_RESULTS   = [YAML_RACE_QUALIFYING, YAML_RACE_GRID, YAML_RACE_RESULTS];
const YAMLS_SPRINT_RESULTS = [YAML_SPRINT_QUALIFYING, YAML_SPRINT_GRID, YAML_SPRINT_RESULTS];

const REGEXP_SPLIT = /\r?\n/;

/* текущий сезон */
const CURRENT_SEASON = 2024;

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

/* этапы со спринтами */
const SPRINTS = [];

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

const _parseSimpleYAML = data => {
    let tempObject = Object.create(null);

    data = data.split(REGEXP_SPLIT);

    data.forEach(line => {
        if (line.length > 0) {
            let [key, value] = _line2KeyValue(line);
            if (key.length) {
                tempObject[key] = value.length ? value : null;
            }
        }
    });

    return tempObject;
}

let currentRace = null;

const loadingCircle      = document.querySelector('.loading');

const constructorsTable  = document.querySelector('#constructors');
const driversTable       = document.querySelector('#drivers');
const entrantsTable      = document.querySelector('#entrants');
const racesTable         = document.querySelector('#races');

const raceTable          = document.querySelector('#race');
const raceQualifyTable   = document.querySelector('#race-qualifying');
const raceGridTable      = document.querySelector('#race-grid');
const raceResultsTable   = document.querySelector('#race-results');
const sprintQualifyTable = document.querySelector('#sprint-qualifying');
const sprintGridTable    = document.querySelector('#sprint-grid');
const sprintResultsTable = document.querySelector('#sprint-results');

const mainTables         = [constructorsTable, driversTable, entrantsTable, racesTable];
const raceTables         = [
                                raceTable,
                                sprintQualifyTable, sprintGridTable, sprintResultsTable,
                                raceQualifyTable, raceGridTable, raceResultsTable
                           ];

/* Этап */
class Race {
    round;       // этап чемпионата
    schedule;    // расписание этапа
    grandPrixId; // id Гран При
    circuitId;   // id трассы
    laps;        // кол-во кругов
    distance;    // дистанция гонки
    sprint;      // флаг наличия спринта

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

        if (
            'sprintQualifyingDate' in data && 'sprintQualifyingTime' in data
            &&
            'sprintRaceDate' in data && 'sprintRaceTime' in data
        ) {
            this.sprint = true;
            this.schedule.sprintQualifying = _dateTime2UTC(data?.sprintQualifyingDate || '', data?.sprintQualifyingTime || '');
            this.schedule.sprintRace       = _dateTime2UTC(data?.sprintRaceDate || '', data?.sprintRaceTime || '');
        }
    }
}

const Circuits     = new Map();
const Constructors = new Map();
const Drivers      = new Map();
const Engines      = new Map();
const GrandsPrix   = new Map();
const Races        = new Map();

(function () {
    const URL  = [URL_F1DB, URI_SEASONS, CURRENT_SEASON];
    const URLs = [
        [...URL, YAML_CONSTRUCTOR_STANDINGS].join('/'),
        [...URL, YAML_DRIVER_STANDINGS].join('/'),
        [...URL, YAML_ENTRANTS].join('/'),
    ];

    const ConstructorStandings = [];
    const DriverStandings      = [];
    const Entrants             = [];

    Promise.all(
        URLs.map(url => fetch(url).then(response => response.text()))
    ).then(results => {

        results.forEach(data => {
            let source = null; // источник данных

            if (data.includes('entrantId')) {
                source = YAML_ENTRANTS;
            } else if (data.includes('constructorId')) {
                source = YAML_CONSTRUCTOR_STANDINGS;
            } else if (data.includes('driverId')) {
                source = YAML_DRIVER_STANDINGS;
            }

            data = data.split(REGEXP_SPLIT);

            let tempObject = Object.create(null);

            for (let i = 0; i < data.length; i ++) {
                let [key, value] = _line2KeyValue(data[i]);

                switch (key) {
                    case 'position': {
                        value = Number.parseInt(value);

                        if (value > 1) {
                            if (YAML_CONSTRUCTOR_STANDINGS == source) {
                                ConstructorStandings.push(tempObject);
                            } else if (YAML_DRIVER_STANDINGS == source) {
                                DriverStandings.push(tempObject);
                            }

                            tempObject = Object.create(null);
                        }

                        tempObject.position = value;
                        break;
                    }

                    case 'constructorId': {
                        tempObject.constructorId = value;

                        if (Constructors.has(tempObject.constructorId)) break;

                        // получение названия конструктора
                        Constructors.set(tempObject.constructorId, tempObject.constructorId);

                        let currURL = [URL_F1DB, URI_CONSTRUCTORS, tempObject.constructorId + '.yml'].join('/');

                        fetch(currURL)
                        .then(response => response.text())
                        .then(constructor => {
                            constructor = _parseSimpleYAML(constructor);

                            if (constructor?.id && constructor?.name) {
                                Constructors.set(constructor.id, constructor.name);
                            }
                        });

                        break;
                    }

                    case 'driverId': {
                        let driverId = value;

                        if (YAML_DRIVER_STANDINGS == source) {
                            tempObject.driverId = driverId;
                        } else if (YAML_ENTRANTS == source) {
                            let [key1, value1] = _line2KeyValue(data[i + 1]); // rounds
                            let [key2, value2] = _line2KeyValue(data[i + 2]); // testDriver?

                            // у данного участника данный пилот числится только тест-пилотом
                            if ((0 == value1.length) && ('testDriver' == key2)) break;

                            tempObject.drivers.push(driverId);
                        }

                        if (Drivers.has(driverId)) break;

                        // получение имени пилота
                        let tempDriver = {
                            name: driverId,
                            permanentNumber: null
                        };

                        Drivers.set(driverId, tempDriver);

                        let currURL = [URL_F1DB, URI_DRIVERS, driverId + '.yml'].join('/');

                        fetch(currURL)
                        .then(response => response.text())
                        .then(driver => {
                            driver = _parseSimpleYAML(driver);

                            if (driver?.id && driver?.name) {
                                tempDriver.name = driver.name;
                                tempDriver.permanentNumber = driver?.permanentNumber || null;

                                Drivers.set(driver.id, tempDriver);
                            }
                        });

                        break;
                    }

                    case 'drivers': {
                        tempObject.drivers = [];
                        break;
                    }

                    case 'engineManufacturerId': {
                        tempObject.engineId = value;

                        if (Engines.has(tempObject.engineId)) break;

                        // получение названия двигателя
                        Engines.set(tempObject.engineId, tempObject.engineId);

                        let currURL = [URL_F1DB, URI_ENGINES, tempObject.engineId + '.yml'].join('/');

                        fetch(currURL)
                        .then(response => response.text())
                        .then(engine => {
                            engine = _parseSimpleYAML(engine);

                            if (engine?.id && engine?.name) {
                                Engines.set(engine.id, engine.name);
                            }
                        });

                        break;
                    }

                    case 'entrantId': {
                        if (tempObject?.constructorId && tempObject?.drivers && tempObject?.engineId) {
                            Entrants.push(tempObject);

                            tempObject = Object.create(null);
                        }
                        break;
                    }

                    case 'points': {
                        tempObject.points = parseInt(value);
                        break;
                    }
                }
            }

            if (YAML_CONSTRUCTOR_STANDINGS == source) {
                ConstructorStandings.push(tempObject);
            } else if (YAML_DRIVER_STANDINGS == source) {
                DriverStandings.push(tempObject);
            } else if (YAML_ENTRANTS == source) {
                Entrants.push(tempObject);
            }
        })

    }).finally(() => {
        console.log(ConstructorStandings);
        console.log(DriverStandings);
        console.log(Entrants);

        constructorsTable.hidden = (null != currentRace);
        driversTable.hidden      = (null != currentRace);
        entrantsTable.hidden     = (null != currentRace);
    });

})();

/* Импорт и вывод положений в чемпионате конструкторов */
/*
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
        data = data.split(REGEXP_SPLIT);

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
                this.points        = parseInt(data?.points, 10) || 0;
            }
        }

        let Standings = [];
        let length    = data.length - 1;

        for (let i = 0; i < length; i += 4) {
            let key, tempObject = new Object(null);

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
        const CTBODY = constructorsTable.querySelector('tbody');
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

    }).finally(() => constructorsTable.hidden = (null != currentRace));

})();
*/

/* Импорт положений в чемпионате пилотов */
/*
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
        data = data.split(REGEXP_SPLIT);

        // положение в Чемпионате пилотов
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
                this.points   = parseInt(data?.points, 10) || 0;
            }
        }

        let Standings = [];
        let length = data.length - 1;

        for (let i = 0; i < length; i += 3) {
            let key, tempObject = new Object(null);

            [key, tempObject.position] = _line2KeyValue(data[i]);
            [key, tempObject.driverId] = _line2KeyValue(data[i + 1]);
            [key, tempObject.points]   = _line2KeyValue(data[i + 2]);

            let standing = new DriverStanding();
            standing.update(tempObject);

            Standings.push(standing);
        }

        // сортировка по position
        Standings = Standings.sort((a, b) => a.position - b.position);

        // предварительный вывод положений в чемпионате конструкторов
        const DTBODY = driversTable.querySelector('tbody');
        const STMPL  = document.querySelector('#standings-template');

        Standings.forEach(standing => {
            if (null == standing) return;

            let tr = document.importNode(STMPL.content, true);
            let td = tr.querySelectorAll('td');

            td[0].textContent = standing.position;
            td[1].textContent = standing.driverId;
            td[1].setAttribute('data-driver', standing.driverId);
            td[2].textContent = standing.points;

            DTBODY.appendChild(tr);
        });

    }).finally(() => drivers.hidden = (null != currentRace));

})();
*/

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
        data = data.split(REGEXP_SPLIT);

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

        for (let i = 0; i < data.length; i ++) {
            let [key, value] = _line2KeyValue(data[i]);

            switch (key) {
                case 'constructorId': {
                    let constructorId = value;

                    if (null !== entrant.constructorId) {
                        // участник из предыдущего цикла
                        Entrants.push(entrant);
                    }

                    // новый участник
                    entrant = new Entrant();
                    entrant.constructorId = constructorId;

                    if (Constructors.has(constructorId)) break;

                    // получение названия конструктора
                    Constructors.set(constructorId, constructorId);

                    let currURL = [URL_F1DB, URI_CONSTRUCTORS, constructorId + '.yml'].join('/');

                    fetch(currURL).then(function(response) {
                        if (response.ok) {
                            return Promise.resolve(response);
                        } else {
                            console.log(response.status, response.statusText);
                            return Promise.reject(new Error(response.status));
                        }
                    }).then(response => response.text())
                    .then(constructor => {
                        constructor = _parseSimpleYAML(constructor);

                        if (constructor?.id && constructor?.name) {
                            Constructors.set(constructor.id, constructor.name);
                        }
                    });

                    break;
                }

                case 'engineManufacturerId': {
                    let engineId = value;

                    entrant.engineId = engineId;

                    if (Engines.has(engineId)) break;

                    // получение названия двигателя
                    Engines.set(engineId, engineId);

                    let currURL = [URL_F1DB, URI_ENGINES, engineId + '.yml'].join('/');

                    fetch(currURL).then(function(response) {
                        if (response.ok) {
                            return Promise.resolve(response);
                        } else {
                            console.log(response.status, response.statusText);
                            return Promise.reject(new Error(response.status));
                        }
                    }).then(response => response.text())
                    .then(engine => {
                        engine = _parseSimpleYAML(engine);

                        if (engine?.id && engine?.name) {
                            Engines.set(engine.id, engine.name);
                        }
                    });

                    break;
                }

                case 'driverId': {
                    let driverId = value;
                    let [key1, value1] = _line2KeyValue(data[i + 1]); // rounds
                    let [key2, value2] = _line2KeyValue(data[i + 2]); // testDriver?

                    // у данного участника данный пилот числится только тест-пилотом
                    if ((0 == value1.length) && ('testDriver' == key2)) break;

                    entrant.drivers.push(driverId);

                    if (Drivers.has(driverId)) break;

                    // получение имени пилота
                    /* Пилот */
                    class Driver {
                        id;
                        name;
                        permanentNumber;

                        constructor(driverId) {
                            this.id = driverId;
                            this.name = driverId;
                            this.permanentNumber = null;
                        }

                        // присвоение значений
                        update(data) {
                            Object.keys(this).forEach(key => this[key] = (key in data) ? data[key] : null);
                        }
                    }

                    let driver = new Driver(driverId);

                    Drivers.set(driverId, driver);

                    let currURL = [URL_F1DB, URI_DRIVERS, driverId + '.yml'].join('/');

                    fetch(currURL).then(function(response) {
                        if (response.ok) {
                            return Promise.resolve(response);
                        } else {
                            console.log(response.status, response.statusText);
                            return Promise.reject(new Error(response.status));
                        }
                    }).then(response => response.text())
                    .then(content => {
                        let tempObject = _parseSimpleYAML(content);

                        if (tempObject?.id && tempObject?.name) {
                            driver.update(tempObject);

                            Drivers.set(driver.id, driver);
                        }
                    });

                    break;
                }
            }
        }

        // сортировка по constructorId
        Entrants.push(entrant);
        Entrants = Entrants.sort((a, b) => a.constructorId - b.constructorId);

        // предварительный вывод участников
        const ETBODY  = entrantsTable.querySelector('tbody');
        const ECTMPL  = document.querySelector('#entrants-constructor-template');
        const ECETMPL = document.querySelector('#entrants-engine-template');
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
                td[1].setAttribute('data-driver', driver);
                td[1].textContent = driver;

                ETBODY.appendChild(tr);
            });
        });

    }).finally(() => entrantsTable.hidden = (null != currentRace));

})();

/* Вывод Calendar */
/* Импорт этапов (Races) и Гран При (GrandsPrix)*/
(function () {
    const RTBODY = racesTable.querySelector('tbody');
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

            currentRace = e.target.closest('tr').dataset.id;
            loadGrandPrix();

            history.pushState(currentRace, '', currentRace);
        });

        RTBODY.appendChild(tr);
        RTBODY.lastElementChild.setAttribute('data-id', grandPrixId);
    });

    let url  = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, URI_SEASON_RACES];
    let URLs = [];

    RACES.forEach((grandPrixId, i) => {
        // календарь этапов
        let round   = i + 1;
        let currURL = [...url, _race2URI(round, grandPrixId), YAML_RACE];

        URLs.push(currURL.join('/'));
        URLs.push([URL_F1DB, URI_GRANDS_PRIX, grandPrixId + '.yml'].join('/'));
    });

    Promise.all(
        URLs.map(url => fetch(url).then(response => response.text()))
    ).then(data => {
        // Гран При
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

        data.forEach(content => {
            if (content.length > 1) {
                let tempObject = _parseSimpleYAML(content);

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

        const dateOptions = {month: 'long', day: 'numeric', year: 'numeric'};
        dateOptions.month = (document.body.clientWidth < 480) ? 'short' : 'long';
        const timeOptions = {hour: 'numeric', minute: 'numeric', hour12: false};

        /* Заполнение Calendar */
        Races.forEach(race => {
            if (null == race) return;

            let dtime = new Date(race.schedule.race - 60 * 1000 * (new Date).getTimezoneOffset());

            let tr = racesTable.querySelector('[data-id="' + race.grandPrixId + '"]');
            let td = tr.querySelectorAll('td');

            td[0].innerHTML   = race.sprint ? ('<span class="badge" data-badge="s">' + race.round + '</span>') : race.round;
            td[1].textContent = new Intl.DateTimeFormat('en-US', dateOptions).format(dtime);
            td[2].textContent = new Intl.DateTimeFormat('en-US', timeOptions).format(dtime);
            td[3].querySelector('a').textContent = race.grandPrix()?.name || race.grandPrixId;

            td.forEach(el => el.style.whiteSpace = 'nowrap');
        });

    })
    .catch(error => console.log(error))
    .finally(() => racesTable.hidden = (null != currentRace));

})();

/* Заполнение названий конструкторов, двигателей */
(function () {
    setTimeout(() => {
        Constructors.forEach((name, id) =>
            document.querySelectorAll('[data-constructor="' + id + '"]').forEach(node => node.textContent = name)
        )

        Engines.forEach((name, id) =>
            document.querySelectorAll('[data-engine="' + id + '"]').forEach(node => node.textContent = name)
        )

        entrantsTable.querySelectorAll('[data-driver]').forEach(node => {
            let driver = Drivers.get(node.dataset.driver);
            let td     = node.parentNode.querySelectorAll('td');

            td[0].textContent = (33 == driver.permanentNumber) ? 1 : driver.permanentNumber;
            td[1].textContent = driver.name;
        });

        driversTable.querySelectorAll('[data-driver]').forEach(node => {
            node.textContent = Drivers.get(node.dataset.driver).name;
        });
    }, 3000);
})();

/* Импорт трасс (Circuits) на основе Races */
(function () {
    setTimeout(() => {
        let URLs = [];

        Array.from(Races.values()).map(race => race.circuitId).forEach(circuitId => {
            Circuits.set(circuitId, null);
            URLs.push([URL_F1DB, URI_CIRCUITS, circuitId + '.yml'].join('/'));
        });

        Promise.all(
            URLs.map(url => fetch(url).then(response => response.text()))
        ).then(data => {
            data.forEach(circuit => {
                if (circuit.length > 1) {
                    circuit = _parseSimpleYAML(circuit);
                    if ('id' in circuit && 'fullName' in circuit) {
                        Circuits.set(circuit.id, circuit.fullName);
                    }
                }
            });

            if (currentRace != null && Races.has(currentRace)) {
                let race = Races.get(currentRace);
                raceTable.querySelector('span').textContent = race.circuit();
            }
        }).catch(error => console.log(error)).finally(() => loadingCircle.hidden = true);

    }, 2000);
})();

/* back to main page */
(function () {
    let a = raceTable.querySelector('a');
    a.addEventListener('click', e => {
        event.preventDefault();

        currentRace = null;
        history.pushState(currentRace, '', document.location.pathname.split('/').slice(0, -1).join('/') + '/');

        loadGrandPrix();
    });
})();

window.addEventListener('popstate', e => {
    currentRace = e.state;
    loadGrandPrix();
});

const loadGrandPrix = () => {
    if (RACES.includes(currentRace)) {
        // загрузка Гран При
        loadingCircle.hidden = false;

        mainTables.forEach(t => t.hidden = true);

        let race = Races.get(currentRace);

        (function () {
            raceTable.querySelector('big').textContent = race.grandPrix().fullName;
            raceTable.querySelector('span').textContent = race.circuit();

            let desc = [];
            desc.push('round ' + race.round + ' of ' + RACES.length);
            desc.push(race.laps + ' laps (' + race.distance + ' km)');
            raceTable.querySelector('td').textContent = desc.join(', ');

            raceTable.hidden = false;
        })();

        const dateTimeOptions = {
            month:  'long',
            day:    'numeric',
            year:   'numeric',
            hour:   'numeric',
            minute: 'numeric',
            hour12: false
        };

        const raceURL = [URL_F1DB, URI_SEASONS, CURRENT_SEASON, URI_SEASON_RACES, _race2URI(race.round, race.grandPrixId)];

        class Result {
            position;
            driverNumber;
            driverId;
            constructorId;
            engineId; // engineManufacturerId
            q1;
            q2;
            q3;
            interval;

            constructor() {
                Object.keys(this).forEach(key => this[key] = null);
            }

            constructorEngine() {
                let value = [];
                value.push(Constructors.has(this.constructorId) ? Constructors.get(this.constructorId) : this.constructorId);
                value.push(Engines.has(this.engineId) ? Engines.get(this.engineId) : this.engineId);
                return value.join(' ');
            }

            // присвоение значений
            update(data) {
                Object.keys(this).forEach(key => this[key] = (key in data) ? data[key] : null);
            }
        }

        // Qualifyng Results
        (function () {
            let dateTimeCell = raceQualifyTable.querySelectorAll('thead tr th')[1];

            if (isNaN(race.schedule.qualifying)) {
                dateTimeCell.textContent = '';
            } else {
                let dtime = new Date(race.schedule.qualifying - 60 * 1000 * (new Date).getTimezoneOffset());
                dateTimeCell.textContent = new Intl.DateTimeFormat('en-US', dateTimeOptions).format(dtime);
            }

            let currURL = [...raceURL, YAML_RACE_QUALIFYING].join('/');

            fetch(currURL).then(function(response) {
                if (response.ok) {
                    return Promise.resolve(response);
                } else {
                    console.log(response.status, response.statusText);
                    return Promise.reject(new Error(response.status));
                }
            }).then(response => response.text())
            .then(data => {
                data = data.split(REGEXP_SPLIT);
                console.log(data);

                let Results = [];
                let result  = new Result();

                for (i = 0; i < data.length; i ++) {
                    let [key, value] = _line2KeyValue(data[i]);

                    switch (key) {
                    }
                }
/*
                // предварительный вывод участников
                const ETBODY  = ETABLE.querySelector('tbody');
                const ECTMPL  = document.querySelector('#entrants-constructor-template');
                const ECETMPL = document.querySelector('#entrants-engine-template');
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
*/
            }).finally(() => raceQualifyTable.hidden = false);

        })();

        loadingCircle.hidden = true;
    } else {
        // отображение главной страницы
        currentRace = null;
        raceTables.forEach(t => t.hidden = true);
        mainTables.forEach(t => t.hidden = false);
    }
}

currentRace = document.location.pathname.split('/').pop();
currentRace = RACES.includes(currentRace) ? currentRace : null;

if (currentRace != null) {
    setTimeout(() => { loadGrandPrix() }, 2000);
}
