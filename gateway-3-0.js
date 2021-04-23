/** API GATEWAY RESIOT
 *
 *  VERSIONE 3.0
 *
 *  SUPPORTATE LE RICHIESTE PROVENIENTI SULLA 8080 "GET" && "POST" ("POST" con Content-Type standard -> "application/x-www-form-urlencoded")
 *
 *  Esempio richiesta GET -> http://spirit.undo.it:55700/openeye/?deveui=0000000000000013&appeui=0000000000000001&token=nr1llrr5rfmcmndu42qm02i2z4d4892q7a18llvhqkyioojx0p9mwzq8obh5xpsl&dataconnector=636f6e32&cam_ping=1&user=caravano&pass=caravano&port=9003
 *  Esempio richiesta POST -> {"deveui":"0000000000000013","appeui":"0000000000000001","token":"nr1llrr5rfmcmndu42qm02i2z4d4892q7a18llvhqkyioojx0p9mwzq8obh5xpsl","dataconnector":"636f6e34","payload":{"temperature":"1.23","lux":"4.56","co2":"7.89"}}
 *
 *  "dataconnector" [opzionale] - necessario solo in caso di utilizzo custom Data Connector
 *
 */

const querystring = require('querystring');
const https = require('https');


//Import the necessary libraries/declare the necessary objects
var express = require("express");
var myParser = require("body-parser");
var app = express();


// ========= DATI CONNESSIONE AIOT =========
const AIOT_HOST     = "aiot.servizispeciali.it";
const AIOT_PORTA    = 443;
const AIOT_GEN      = "generic";
const AIOT_PATH     = "/endpoints/";

var mio_ip = "";

/* Endpoint da valorizzare (sarà "generic" nel caso in cui non arrivi nessun elemento "datacconnector" nella richiesta ,
*  altrimenti avra' il valore che proviene dalla richiesta GET/POST ricevuta). Attenzione a usare come endpoint
*  data connector custom, perchè và configurato opportunamente resiot !
*
*  [*] NOTA : dalla documentazione resiot sappiamo che possiamo avere un endpoint generico "/endpoints/generic" oppure
*  uno custom col valore esadecimale es. -> "/endpoints/636f6e34" collegati ai data connectors.
*
*  In realta' il data connector di default resiot non viene usato sempre come quello di default .... :Oo
**/
var endpoint = "";

// const __AIOTENDPOINT__ = "https://" + AIOT_HOST + AIOT_PATH;

// Token Autorizzazione Dispositivo - Resiot -> My Settings -> Security Token
// const AIOT_AUTH     = "nr1llrr5rfmcmndu42qm02i2z4d4892q7a18llvhqkyioojx0p9mwzq8obh5xpsl";

// ========= FINE DATI CONNESSIONE AIOT =========

/** Ritorna il timestamp attuale in UTC
 *
 */
function log_get_data(){

    // timestamp
    var ts          = Date.now();
    var ts_locale   = new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" });
    var data_tz     = new Date(ts_locale);

    var data_obj    = new Date(ts);
    var giorno      = data_obj.getDate();
    var mese        = data_obj.getMonth() + 1;
    var anno        = data_obj.getFullYear();



    var ore = ("0" + data_tz.getHours()).slice(-2);
    var minuti = ("0" + data_tz.getMinutes()).slice(-2);
    var secondi = ("0" + data_tz.getSeconds()).slice(-2);

    var msg_data = giorno + "/" + mese + "/" + anno + " - " + ore + ":" + minuti + ":" + secondi;

    return msg_data;

}

/** Invio richiesta POST resiot
 *
 * @param req
 * @param res
 * @param method
 * @returns {boolean}
 */
function do_post_resiot(req, res, method){

    // ip con notazione subnet prefix -> ::ffff:192.168.1.1
    mio_ip_prefix = ( (req.connection.remoteAddress !== undefined) && (req.connection.remoteAddress.length > 0) ) ? req.connection.remoteAddress : "";

    // rimzione del subnet prefix
    if (mio_ip_prefix.substr(0, 7) == "::ffff:") {
        mio_ip = mio_ip_prefix.substr(7)
    }

    // console.log(req);

    msg_data = log_get_data();

    if( (method != 'GET') && (method != 'POST') ){
        console.log("[!] hook_openeye() : attenzione metodo non supportato da ip -> " + mio_ip + " ! Supportati solo GET && POST !");
        return false;
    }

    // ricavo deveui && appeui dalla richiesta per metterli nel corpo del messaggio
    if( req.method == 'GET' ){
        var deveui  = req.query.deveui;
        var appeui  = req.query.appeui;
        var token   = req.query.token;

        endpoint = ( (req.query.dataconnector !== undefined) && (req.query.dataconnector.length > 0) ) ? req.query.dataconnector : AIOT_GEN;

        // conversione in stringa json dell'oggetto JSON "req.query" . Req.query e' gia' un'oggetto JSON creato da nodejs dalla richiesta GET

        // aggiungo l'ip nel payload per l'endpoint
        req.query["ip"] = mio_ip;

        var json_str = JSON.stringify(req.query);
        // console.log("[D] json_str -> '" + json_str + "'");

        var json_str_hex = Buffer.from(json_str, 'utf8').toString('hex');

    }


    // [!] Attenzione verranno lette solo le richieste POST Content-Type "application/x-www-form-urlencoded" !
    if( method == 'POST' ){

        // console.log("[D] POST : Gestisco la richiesta ...");

        // console.log(req.body);

        // [!] Attenzione Myparser.urlencoded racchiude l'intera richiesta body ricevuta in un oggetto json (oggetto dentro altro oggetto). Dobbiamo ricavare il primo elemento !
        var primo_el_json = Object.keys(req.body);
        console.log(primo_el_json);

        var richiesta_body =  JSON.parse(primo_el_json);
        console.log(richiesta_body);

        var deveui  = richiesta_body.deveui;
        var appeui  = richiesta_body.appeui;
        var token   = richiesta_body.token;

        endpoint = ( (richiesta_body.dataconnector !== undefined) && (richiesta_body.dataconnector.length > 0) ) ? richiesta_body.dataconnector : AIOT_GEN;

        // aggiungo l'ip nel payload per l'endpoint
        richiesta_body.payload["ip"] = mio_ip;

        var json_str        = JSON.stringify(richiesta_body.payload);
        var json_str_hex    = Buffer.from(json_str, 'utf8').toString('hex');

        // DEBUG
        // console.log("[D] Deveui -> " + deveui);
        // console.log("[D] Appeui -> " + appeui);
        // console.log("[D] Token -> " + token);
        // console.log("[D] POST : fine richiesta ...");

    }

    console.log("[D] " + msg_data + " - " + mio_ip + " -  hook_openeye() : richiesta da deveui -> " + appeui + " - appeui -> " + deveui);
    console.log("[D] " + msg_data + " - " + mio_ip + " - hook_openeye() : tipo richiesta ricevuta -> '" + method + "'");



    console.log("[D] " + mio_ip + " hook_openeye() : stringa json ricevuta -> '" + json_str + "'");
    console.log("[D] " + mio_ip + " hook_openeye() : Codifica HEX stringa ricevuta -> '" + json_str_hex + "'");

    var opz = { deveui, appeui, token };

    // INVIO POST all'AIOT Servizi Speciali
    esito_post_ok = do_post(opz, json_str_hex, res);

    if( esito_post_ok ){
        res.send("[D] " + mio_ip + " hook_openeye() : stringa json -> '" + json_str + "'" +
            "\n[D] hook_openeye() : stringa hex -> '" + json_str_hex + "'");
    }



    // interrompo l'inoltro gateway, gestione manuale
    return true;
}

/** Invio richiesta POST
 *
 *  @param opz[] array  : contenenti deveui && appeui per la richiesta a Resiot
 *  @param payload string hex : stringa esadecimale del payload
 *  @param call_res : oggetto res del chiamante
 *
 *  @return true se la post viene eseguita correttamente - false altrimenti
 *
 */
function do_post(opz, payload, call_res){

    if( opz["deveui"] === undefined || (opz["deveui"].length == 0) ){
        console.log("[!] do_post() : attenzione \"deveui\" nullo o non valido !");
        call_res.send("[!] do_post() : attenzione \"deveui\" nullo o non valido !");
        return false;
    }

    if( opz["appeui"] === undefined || (opz["appeui"].length == 0) ){
        console.log("[!] do_post() : attenzione \"appeui\" nullo o non valido !");
        call_res.send("[!] do_post() : attenzione \"appeui\" nullo o non valido !");
        return false;
    }

    if( opz["token"] === undefined || (opz["token"].length == 0) ){
        console.log("[!] do_post() : attenzione \"token\" nullo o non valido !");
        call_res.send("[!] do_post() : attenzione \"token\" nullo o non valido !");
        return false;
    }

    if( payload === undefined || (payload.length == 0) ){
        console.log("[!] do_post() : attenzione \"payload\" nullo o non valido !");
        call_res.send("[!] do_post() : attenzione \"payload\" nullo o non valido !");
        return false;
    }



    // [*] Convertitore string to HEX -> https://codebeautify.org/hex-string-converter


    // [*] Resiot Vuole il JSON senza stringify !
    var postData = '{' +

        '"msgtype":"data_uplink"' +

        // data hex encoded -> {"temperature":"1.23","luminosita":"4.56","co2":"7.89"}
        ',"data":"' + payload +'"' +

        ',"deveui":"' + opz["deveui"] +'"' +
        ',"appeui":"' + opz["appeui"] +'"' +

        '}'
    ;

    console.log("[D] Endpoint finale -> " + AIOT_PATH + endpoint);


    // ====== CONNESSIONE OPZIONI ======
    var options = {

        hostname: AIOT_HOST,
        port: AIOT_PORTA,
        path: AIOT_PATH + endpoint,
        method: 'POST',

        headers: {
            "Content-Type": "application/json",
            "Authorization": opz["token"],
            "Content-Length": postData.length
        }

    };
    // ====== DATI CONNESSIONE ======



    // ====== COMUNICAZIONE CON AIOT ======
    var req = https.request(options, (res) => {
        console.log('[D] Risposta POST STATUS CODE: ', res.statusCode);
        // console.log('\n[D] Risposta Server [headers]:\n', res.headers);

        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.log("[!] Errore !");
        console.error(e);
    });

    // DEBUG
    console.log("\n[D] Richiesta POST inviata all'endpoint: \n" + postData);
    req.write(postData);

    req.end();

    return true;

}

// Test GET -> http://172.16.238.10:8080/openeye/?deveui=0000000000000013&appeui=0000000000000001&token=nr1llrr5rfmcmndu42qm02i2z4d4892q7a18llvhqkyioojx0p9mwzq8obh5xpsl&dataconnector=636f6e34&temperature=1.23&lux=4.56&co2=447.89
// app.use(myParser.urlencoded({extended : true}));
app.get("/openeye", function(req, res) {
    // console.log(req.body); //This prints the JSON document received (if it is a JSON document)
    // res.send("[D] GET OK Ricevuta !");
    do_post_resiot(req, res, "GET");
});

// TEST POST INSOMNIA con data connector custom -> {"deveui":"0000000000000013","appeui":"0000000000000001","token":"nr1llrr5rfmcmndu42qm02i2z4d4892q7a18llvhqkyioojx0p9mwzq8obh5xpsl","dataconnector":"636f6e34","payload":{"temperature":"1.23","lux":"4.56","co2":"7.89"}}
app.use(myParser.urlencoded({extended : true}));
app.post("/openeye", function(req, res) {
    // console.log(req.body); //This prints the JSON document received (if it is a JSON document)
    // res.send("[D] Post OK Ricevuta !");
    do_post_resiot(req, res, "POST");
});

//Start the server and make it listen for connections on port 8080

app.listen(8080);