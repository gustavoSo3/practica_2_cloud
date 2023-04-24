var express = require("express");
var router = express.Router();

const {
	DynamoDBClient,
	PutItemCommand,
	PutItemCommandInput,
	ScanCommand,
	ScanCommandInput,
	ScanInput,
} = require("@aws-sdk/client-dynamodb");
const {
	LexRuntimeServiceClient,
	PostTextCommand,
	PostTextCommandInput,
} = require("@aws-sdk/client-lex-runtime-service");

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const lexClient = new LexRuntimeServiceClient({ region: "us-east-1" });


//TODO: Cambiar esto por nuestro custom name
async function insertItemToDB(newContact) {

	/**@type { PutItemCommandInput } */
	const params = {
		Item: {
			Nombre: { S: newContact.Nombre },
			Apellido: { S: newContact.Apellido },
			Telefono: { S: newContact.Telefono },
			Email: { S: newContact.Email },
		},
		//TODO: Cambiar esto por nuestro custom name
		TableName: "Practica3",
	};

	const command = new PutItemCommand(params);
	const dynamoResponse = await dynamoClient.send(command);
	return dynamoResponse;
}

//TODO: Cambiar esto por nuestro custom name
async function getItemsFromDB(slots) {

	/**@type {string[]} */
	const filterExpression = [];
	/**@type {ScanInput.ExpressionAttributeValues} */
	const attrValues = {};

	if (slots.Nombre) {
		filterExpression.push(`Nombre=:nombre`);
		attrValues[":nombre"] = { S: slots.Nombre };
	}
	if (slots.Apellido) {
		filterExpression.push(`Apellido=:apellido`);
		attrValues[":apellido"] = { S: slots.Apellido };
	}
	if (slots.Telefono) {
		filterExpression.push(`Telefono=:telefono`);
		attrValues[":telefono"] = { S: slots.Telefono };
	}
	if (slots.Email) {
		filterExpression.push(`Email=:email`);
		attrValues[":email"] = { S: slots.Email };
	}


	/**@type {ScanCommandInput} */
	const params = {
		//TODO: Cambiar esto por nuestro custom name
		TableName: "Practica3",
		ExpressionAttributeValues: attrValues,
		FilterExpression: filterExpression.join(" and "),
	};

	const command = new ScanCommand(params);
	const dynamoResponse = await dynamoClient.send(command);

	const contactData = dynamoResponse.Items;

	return contactData;
}

router.post("/", async function (req, res) {
	const sessionId = req.session.id;

	/**@type {PostTextCommandInput} */
	const params = {
		botAlias: "TestBotAlias",
		botName: "Practica3",
		inputText: req.body.text,
		userId: sessionId,
	};

	const postCommand = new PostTextCommand(params);
	const response = await lexClient.send(postCommand);

	// Handle intents
	if (response.intentName == "BuscarContacto") {
		// Check if we have at least one slot
		let hasAtLeastOneSlot = false;
		Object.values(response.slots).forEach((slotValue) => {
			if (slotValue != null) {
				hasAtLeastOneSlot = true;
			}
		});
		if (hasAtLeastOneSlot) {
			// Llamar DynamoDB
			const contactResponse = await getItemsFromDB(response.slots);

			let responseString = "";
			if (contactResponse.length == 0) {
				responseString += "No se encontró ningún contacto con esos datos.";
				return;
			} else {
				responseString += `Se encontraron estos contactos:\n`;
				contactResponse.forEach((contact) => {
					responseString += `${contact.Nombre.S} ${contact.Apellido.S}:
Tel - ${contact.Telefono.S}
Email - ${contact.Email.S}\n\n`;
				});
			}
			res.send({ resp: responseString });
			return;
		} else {
			res.send({
				resp: "Se necesita al menos un dato para poder buscar en tu directorio.",
			});
		}
	}

	if (response.dialogState != "Fulfilled") {
		const frontResponse = { resp: response.message };
		res.send(frontResponse);
		return;
	}

	if (response.intentName == "CrearContacto") {
		const newContactResponse = await insertItemToDB(response.slots);
		const frontResponse = { resp: response.message };
		res.send(frontResponse);
		return;
	}
});

module.exports = router;
