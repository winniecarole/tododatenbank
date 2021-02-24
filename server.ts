import * as express from "express";
import * as session from "express-session";
import * as mysql from "mysql";

// Ergänzt/Überläd den Sessionstore um das Attribut "signInName"t
declare module "express-session" {
    interface Session {
        signInName: string;
        signInId: number;
    }
}

//Speicherung der Daten für die Local-Session //0
var localSession= { 
    signInName:undefined,
    signInId:undefined
 }                                          //0

// Stellt eine Verbindung zum Datenbankserver her   //01
const connection: mysql.Connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'user_tasks',
    port:3306
});                                                        //01

// Öffnet die Verbindung zum Datenbankserver
connection.on("connect", err => {
    connection.connect("connect", err => {
        if (err != null) {
            console.log("DB fehler "+ err);
        }
    });
    
  });

// Erzeugt und startet einen Express-Server
const router: express.Express = express();
router.listen(8082, () => {
    console.log("Server gestartet auf http://localhost:8080");
});

// Bei jedem Request werden vorhandene Nutzdaten von Text in Objekte geparst
router.use(express.json());
router.use(express.urlencoded({extended: false}));

// Bei jedem Request wird, falls noch nicht vorhanden, ein Cookie erstellt      1

router.use(session({
    cookie: {
        expires: new Date(Date.now() + (50*50)),
    },
    secret: Math.random().toString(),

}));                                                                           //1

// Der Ordner ./view/res wird auf die URL /res gemapped
router.use("/res", express.static(__dirname + "/view/res"));

// Gibt auf der URL / die Startseite zurück
router.get("/", (req: express.Request, res: express.Response) => {
    res.sendFile(__dirname + "/view/index.html");
});

// Beschreibt alle Routen und ruft die jeweilige Funktion oder Funktionskette auf
router.post("/signIn", signIn);
router.post("/signOut", signOut);
router.post("/task", checkLogin, addTask);
router.delete("/task/:id", checkLogin, delTask);
router.get("/tasks", checkLogin, getTasks);
router.get("/isLoggedIn", checkLogin, isLoggedIn);

// Prüft, ob ein Nutzer registriert ist und speichert ggf. den Nutzernamen im Sessionstore ab         2
function signIn(req: express.Request, res: express.Response): void {
    const signInName: string = req.body.signInName;
    const signInPass: string = req.body.signInPass;

    query( "SELECT * FROM `anwender` WHERE `name` = ? and `passwort`= ? ", new Array(signInName,signInPass)).then((result:any) => {

        if(result!= undefined && result.length>0 ){
            
            //Fals nicht in dem Request gespeichert wird 
            localSession.signInName = signInName;
            localSession.signInId = result[0].id;

            req.session.signInName = signInName;
            req.session.signInId = result[0].id;
            req.session.save();
            res.sendStatus(200);

        }else{
            res.status( 400).send("Anmeldung fehlgeschlagen. Bitte erneut versuchen");
        }

    }).catch(() =>{
        res.sendStatus(500);
    });
    res.status(200);

}                                                                                                   //2

// Löscht den Sessionstore und weist den Client an, das Cookie zu löschen     3
function signOut(req: express.Request, res: express.Response): void {
    req.session.signInName=undefined;
    req.session.signInId = undefined;
    localSession.signInName=undefined;
    localSession.signInId=undefined;

    req.session.destroy(()=>{
        res.clearCookie("connect.sid");
        res.sendStatus(200);
    });
}                                                                                       //3

// Fügt einen neuen Task der Datenbank hinzu
function addTask(req: express.Request, res: express.Response): void {
    const taskName: string = req.body.taskName;
    const taskDate: string = req.body.taskDate;
    const id:number=req.session.signInId===undefined?localSession.signInId:req.session.signInId ;
    const name: string = req.session.signInName===undefined?localSession.signInName:req.session.signInName ;

    query("INSERT INTO `tasks`(`anwender_id`,`name`, `titel`, `faelligkeit`) VALUES (?,?,?,?);",[id,name,taskName,taskDate]).then((result: any)=>{
        res.status(200);
        res.sendStatus(200);
    }).catch(()=>{
        res.sendStatus(500);
    });
    res.status(200);
}

// Löscht einen Task aus der Datenbank                              4
function delTask(req: express.Request, res: express.Response): void {
    const id: string = req.params.id;
    
    query("DELETE FROM `tasks` WHERE id = ? ;",[id]).then((result: any)=>{
        res.sendStatus(200);
    }).catch(()=>{
        res.sendStatus(200);
    })

}                                                                    //4

// Gibt alle Tasks eines Anwenders zurück
function getTasks(req: express.Request, res: express.Response): void {
   const id:number=req.session.signInId===undefined?localSession.signInId:req.session.signInId ;

    query("SELECT id, titel, faelligkeit FROM tasks WHERE anwender_id = ?;", [id]).then((result: any) => {
        res.json(result);
    }).catch(() => {
        // DBS-Fehler
        res.sendStatus(500);
    });
}

// Eine sog. Middleware-Route prüft, ob der Client angemeldet ist und ruft ggf. die nächste Funktion auf
function checkLogin(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (req.session.signInName !== undefined || localSession.signInName !== undefined) {
        // Ruft die nächste Funktion der Funktioskette
        next();
    } else {
        // Client nicht angemeldet
        res.sendStatus(401);
    }
}

// Kleine Hilfsfunktion, die immer 200 OK zurückgibt
function isLoggedIn(req: express.Request, res: express.Response): void {
    res.sendStatus(200);
}

// Ein eigener Wrapper, um die MySQL-Query als Promise (then/catch Syntax) zu nutzen
function query(sql: string, param: any[] = []): Promise<any> {
    return new Promise<any>((resolve: any, reject: any) => {
        connection.query(sql, param, (err: mysql.MysqlError | null, results: any) => {
            if (err === null) {
                resolve(results);
            } else {
                reject(err);
            }
        });
    });
}
