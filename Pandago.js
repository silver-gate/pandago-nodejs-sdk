const axios = require('axios');
const qs = require('qs');
const nJwt = require('njwt');

module.exports = class Pandago {
  constructor({
    env = 'sandbox',
    countryCode = 'tw',
    version = 'v1',
    clientId,
    keyId,
    privateKey,
    scope = 'pandago.api.sg.*',
  }) {
    this.env = env;
    this.authUrl = env === 'sandbox' ?
      'https://sts-st.deliveryhero.io' :
      'https://sts.deliveryhero.io';
    this.apiUrl = env === 'sandbox' ?
      `https://pandago-api-sandbox.deliveryhero.io/sg/api/${version}` :
      `https://pandago-api-apse.deliveryhero.io/${countryCode}/api/${version}`;
    this.clientId = clientId;
    this.keyId = keyId;
    this.privateKey = privateKey;
    this.scope = scope;
  }

  _getSignedJwtToken() {
    const { clientId, keyId, privateKey } = this;
    const claims = {
      iss: clientId,
      sub: clientId,
      aud: 'https://sts.deliveryhero.io',
    };

    const jwt = nJwt.create(claims, privateKey, 'RS256');
    jwt.setHeader('kid', keyId);

    return jwt.compact();
  }

  async _getApiHeaders() {
    const { accessTokenExpiredAt } = this;

    if (!accessTokenExpiredAt || (accessTokenExpiredAt && accessTokenExpiredAt >= Date.now())) {
      await this._getAccessToken();
    }

    const { accessToken } = this;

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };
  }

  async _getAccessToken() {
    const { clientId, authUrl, scope } = this;
    const signedJwtToken = this._getSignedJwtToken();

    const options = {
      method: 'POST',
      url: `${authUrl}/oauth2/token`,
      data: qs.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: signedJwtToken,
        scope,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const response = await axios(options);
    this.accessToken = response.data.access_token;
    this.accessTokenExpiredAt = Date.now() + response.data.expires_in * 1000;
  }

  async estimateFee(order) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/orders/fee`,
      data: order,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }

  async estimateTime(order) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/orders/time`,
      data: order,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }

  async submitOrder(order) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/orders`,
      data: order,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }

  async getOrder(orderId) {
    const { apiUrl } = this;
    const options = {
      method: 'GET',
      url: `${apiUrl}/orders/${orderId}`,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }

  async cancelOrder(orderId, reason = 'REASON_UNKNOWN') {
    // DELIVERY_ETA_TOO_LONG
    // MISTAKE_ERROR
    // REASON_UNKNOWN
    const { apiUrl } = this;
    const options = {
      method: 'DELETE',
      url: `${apiUrl}/orders/${orderId}`,
      data: {
        reason,
      },
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }

  async getOrderCurrentCourierLocation(orderId) {
    const { apiUrl } = this;
    const options = {
      method: 'GET',
      url: `${apiUrl}/orders/${orderId}/coordinates`,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }

  async callback(event) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/callback`,
      data: event,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }
};
