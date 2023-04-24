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


async function insertToDataBase(newContact) {

	/**@type { PutItemCommandInput } */
	const params = {
		Item: {
			Nombre: { S: newContact.Nombre },
			Apellido: { S: newContact.Apellido },
			Telefono: { S: newContact.Telefono },
			Email: { S: newContact.Email },
		},
		TableName: "Practica3",
	};

	const command = new PutItemCommand(params);
	const dynamoResponse = await dynamoClient.send(command);
	return dynamoResponse;
}

async function seachInDatabase(slots) {

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
	console.log(sessionId)

	/**@type {PostTextCommandInput} */
	const params = {
		botAlias: "BotPractica",
		botName: "Practica_Bot",
		inputText: req.body.text,
		userId: sessionId,
	};
	console.log(params)

	const postCommand = new PostTextCommand(params);
	console.log("llege 11");
	const response = await lexClient.send(postCommand);
	console.log("llege 22");

	console.log(response);
	console.log("llege 33");

	// Handle intents
	if (response.intentName == "BuscarContacto") {
		console.log("llege 44");
		// Check if we have at least one slot
		let hasAtLeastOneSlot = false;
		Object.values(response.slots).forEach((slotValue) => {
			if (slotValue != null) {
				hasAtLeastOneSlot = true;
			}
		});
		if (hasAtLeastOneSlot) {
			console.log("llege 55");
			// Llamar DynamoDB
			const contactResponse = await seachInDatabase(response.slots);

			console.log(contactResponse);
			console.log("llege 66");

			let responseString = "";
			if (contactResponse.length == 0) {
				responseString += "Los datos no coincidieron con nuestra base de datos.";
			} else {
				responseString += `Econtramos ${contactResponse.length} contactos:\n`;
				contactResponse.forEach((contact, index) => {
					responseString += `${index + 1}-->Nombre: ${contact.Nombre.S},\nApellido: ${contact.Apellido.S},\nTelefono: ${contact.Telefono.S},\n@: ${contact.Email.S}<--\n\n`;
				});
			}
			res.send({ resp: responseString });
			return;
		} else {
			res.send({
				resp: "Necesitamos mas informacion.",
			});
		}
	}

	if (response.dialogState != "Fulfilled") {
		const frontResponse = { resp: response.message };
		res.send(frontResponse);
		return;
	}

	if (response.intentName == "CrearContacto") {
		const newContactResponse = await insertToDataBase(response.slots);
		const frontResponse = { resp: response.message };
		res.send(frontResponse);
		return;
	}
});

module.exports = router;
