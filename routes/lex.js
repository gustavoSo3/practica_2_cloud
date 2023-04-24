var express = require('express');
var router = express.Router();

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { LexRuntimeServiceClient } = require("@aws-sdk/client-lex-runtime-service")

const dynamoClient = new DynamoDBClient({ region: "us-east-1" })
const lexClient = new LexRuntimeServiceClient({ region: "us-east-1" })

router.post('/', async function (req, res) {
	/* @TODO
		Este metodo será invocado por el FRONT END cada que el usuario nos envia un texto.
		El texto que el usuario noss envie se recibirá en req.body.text

		Este debera ser enviado al controlador del LEX junto con un Identificador unico de la sesión
		el cual obtenemos de req.session.id

		La logica recomendada para esta sección es:
			- Enviar a LEX el texto y la sesión y esperar la respuesta.
			- De cada respusta del BOT validar la INTENCION y el ESTADO DEL DIALOGO a fin de saber que realizar:

				Ejemplo:
					 Intención: AgregarContacto
					 Estado: Fulfilled
					 Acción: Agregar a la Base de Datos.

					 Intención: BusquedaContacto
					 Estado: Fulfilled
					 Acción: Buscar en la Base de Datos.
	  
					Intennción: AgregarContacto
					Estado: *
					Acción: Enviar proximo mensaje del BOT.
				 
			- Enviar un JSON de respuestas con el texto a agregar en el chat:             
	*/

	res.send({ resp: "RESPUESTA DEL BOT" })
});

module.exports = router;


