"use strict";
exports.__esModule = true;
var express = require("express");
var session = require("express-session");
var mysql = require("mysql");
//Speicherung der Daten für die Local-Session //0
var localSession = {
    signInName: undefined,
    signInId: undefined
}; //0
// Stellt eine Verbindung zum Datenbankserver her   //01
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'user_tasks',
    port: 3306
}); //01
// Öffnet die Verbindung zum Datenbankserver
connection.on("connect", function (err) {
    connection.connect("connect", function (err) {
        if (err != null) {
            console.log("DB fehler " + err);
        }
    });
});
// Erzeugt und startet einen Express-Server
var router = express();
router.listen(8082, function () {
    console.log("Server gestartet auf http://localhost:8080");
});
// Bei jedem Request werden vorhandene Nutzdaten von Text in Objekte geparst
router.use(express.json());
router.use(express.urlencoded({ extended: false }));
// Bei jedem Request wird, falls noch nicht vorhanden, ein Cookie erstellt      1
router.use(session({
    cookie: {
        expires: new Date(Date.now() + (50 * 50))
    },
    secret: Math.random().toString()
})); //1
// Der Ordner ./view/res wird auf die URL /res gemapped
router.use("/res", express.static(__dirname + "/view/res"));
// Gibt auf der URL / die Startseite zurück
router.get("/", function (req, res) {
    res.sendFile(__dirname + "/view/index.html");
});
// Beschreibt alle Routen und ruft die jeweilige Funktion oder Funktionskette auf
router.post("/signIn", signIn);
router.post("/signOut", signOut);
router.post("/task", checkLogin, addTask);
router["delete"]("/task/:id", checkLogin, delTask);
router.get("/tasks", checkLogin, getTasks);
router.get("/isLoggedIn", checkLogin, isLoggedIn);
// Prüft, ob ein Nutzer registriert ist und speichert ggf. den Nutzernamen im Sessionstore ab         2
function signIn(req, res) {
    var signInName = req.body.signInName;
    var signInPass = req.body.signInPass;
    query("SELECT * FROM `anwender` WHERE `name` = ? and `passwort`= ? ", new Array(signInName, signInPass)).then(function (result) {
        if (result != undefined && result.length > 0) {
            //Fals nicht in dem Request gespeichert wird 
            localSession.signInName = signInName;
            localSession.signInId = result[0].id;
            req.session.signInName = signInName;
            req.session.signInId = result[0].id;
            req.session.save();
            res.sendStatus(200);
        }
        else {
            res.status(400).send("Anmeldung fehlgeschlagen. Bitte erneut versuchen");
        }
    })["catch"](function () {
        res.sendStatus(500);
    });
    res.status(200);
} //2
// Löscht den Sessionstore und weist den Client an, das Cookie zu löschen     3
function signOut(req, res) {
    req.session.signInName = undefined;
    req.session.signInId = undefined;
    localSession.signInName = undefined;
    localSession.signInId = undefined;
    req.session.destroy(function () {
        res.clearCookie("connect.sid");
        res.sendStatus(200);
    });
} //3
// Fügt einen neuen Task der Datenbank hinzu
function addTask(req, res) {
    var taskName = req.body.taskName;
    var taskDate = req.body.taskDate;
    var id = req.session.signInId === undefined ? localSession.signInId : req.session.signInId;
    var name = req.session.signInName === undefined ? localSession.signInName : req.session.signInName;
    query("INSERT INTO `tasks`(`anwender_id`,`name`, `titel`, `faelligkeit`) VALUES (?,?,?,?);", [id, name, taskName, taskDate]).then(function (result) {
        res.status(200);
        res.sendStatus(200);
    })["catch"](function () {
        res.sendStatus(500);
    });
    res.status(200);
}
// Löscht einen Task aus der Datenbank                              4
function delTask(req, res) {
    var id = req.params.id;
    query("DELETE FROM `tasks` WHERE id = ? ;", [id]).then(function (result) {
        res.sendStatus(200);
    })["catch"](function () {
        res.sendStatus(200);
    });
} //4
// Gibt alle Tasks eines Anwenders zurück
function getTasks(req, res) {
    var id = req.session.signInId === undefined ? localSession.signInId : req.session.signInId;
    query("SELECT id, titel, faelligkeit FROM tasks WHERE anwender_id = ?;", [id]).then(function (result) {
        res.json(result);
    })["catch"](function () {
        // DBS-Fehler
        res.sendStatus(500);
    });
}
// Eine sog. Middleware-Route prüft, ob der Client angemeldet ist und ruft ggf. die nächste Funktion auf
function checkLogin(req, res, next) {
    if (req.session.signInName !== undefined || localSession.signInName !== undefined) {
        // Ruft die nächste Funktion der Funktioskette
        next();
    }
    else {
        // Client nicht angemeldet
        res.sendStatus(401);
    }
}
// Kleine Hilfsfunktion, die immer 200 OK zurückgibt
function isLoggedIn(req, res) {
    res.sendStatus(200);
}
// Ein eigener Wrapper, um die MySQL-Query als Promise (then/catch Syntax) zu nutzen
function query(sql, param) {
    if (param === void 0) { param = []; }
    return new Promise(function (resolve, reject) {
        connection.query(sql, param, function (err, results) {
            if (err === null) {
                resolve(results);
            }
            else {
                reject(err);
            }
        });
    });
}
