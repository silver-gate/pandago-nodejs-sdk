const axios = require('axios');
const qs = require('qs');
const nJwt = require('njwt');

module.exports = class Pandago {
  constructor({ env, clientId, keyId, privateKey }) {
    this.env = env;
    this.authUrl = env === 'sandbox' ?
      'https://sts-st.deliveryhero.io' :
      'https://sts.deliveryhero.io';
    this.apiUrl = env === 'sandbox' ?
      'https://private-anon-3581b0e218-pandago.apiary-mock.com' :
      'https://pandago-api-sandbox.deliveryhero.io';
    this.clientId = clientId;
    this.keyId = keyId;
    this.privateKey = privateKey;
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
      await this.getAccessToken();
    }

    const { accessToken } = this;

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };
  }

  async getAccessToken(scope = 'pandago.api.sg.*') {
    const { clientId, authUrl } = this;
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
      url: `${apiUrl}/sg/api/v1/orders/fee`,
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
      url: `${apiUrl}/sg/api/v1/orders/time`,
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
      url: `${apiUrl}/sg/api/v1/orders`,
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
      url: `${apiUrl}/sg/api/v1/orders/${orderId}`,
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
      url: `${apiUrl}/sg/api/v1/orders/${orderId}`,
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
      url: `${apiUrl}/sg/api/v1/orders/${orderId}/coordinates`,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }
};
