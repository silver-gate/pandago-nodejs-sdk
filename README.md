# pandago-nodejs-sdk

## GetStarted

```bash
npm i --save pandago-nodejs-sdk
```

```js
const Pandago = require('pandago-nodejs-sdk');

const pandago = new Pandago({
  env: 'sandbox', // production
  clientId: CLIENT_ID,
  keyId: KEY_ID,
  privateKey: PRIVATE_KEY, 
});

// Bearer token will be generated when calling the apis.
```

### Submission

```js
await pandago.submitOrder({
  "sender": {
    "name": "Pandago",
    "phone_number": "+6500000000",
    "location": {
      "address": "1 2nd Street #08-01",
      "latitude": 1.2923742,
      "longitude": 103.8486029
    },
    "notes": "use the left side door"
  },
  "recipient": {
    "name": "Merlion",
    "phone_number": "+6500000000",
    "location": {
      "address": "20 Esplanade Drive",
      "latitude": 1.2857488,
      "longitude": 103.8548608
    },
    "notes": "use lift A and leave at the front door"
  },
  "amount": 23.5,
  "payment_method": "PAID",
  "description": "Refreshing drink"
});
```

## Documentations

- https://pandago.docs.apiary.io/#