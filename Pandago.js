const axios = require('axios');
const qs = require('qs');
const nJwt = require('njwt');

const MAX_RETRIES = 2;

module.exports = class Pandago {
  constructor({
    env = 'sandbox',
    countryCode = 'tw',
    version = 'v1',
    clientId,
    keyId,
    privateKey,
    scope = 'pandago.api.sg.*',
    debug,
  }) {
    this.env = env;
    this.authUrl = env === 'sandbox' ? 'https://sts-st.deliveryhero.io' : 'https://sts.deliveryhero.io';
    this.apiUrl = env === 'sandbox' ? `https://pandago-api-sandbox.deliveryhero.io/sg/api/${version}` : `https://pandago-api-apse.deliveryhero.io/${countryCode}/api/${version}`;
    this.clientId = clientId;
    this.keyId = keyId;
    this.privateKey = privateKey;
    this.scope = scope;
    this.debug = debug;
  }

  log(data) {
    if (this.debug) {
      console.log(data); // eslint-disable-line no-console
    }
  }

  getSignedJwtToken() {
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

  async getApiHeaders(force = false) {
    const { accessTokenExpiredAt } = this;

    if (force
      || !accessTokenExpiredAt
      || (accessTokenExpiredAt && accessTokenExpiredAt < Date.now())
    ) {
      await this.getAccessToken();
    }

    const { accessToken } = this;

    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async getAccessToken() {
    const {
      clientId,
      authUrl,
      scope,
    } = this;
    const signedJwtToken = this.getSignedJwtToken();

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

    const {
      access_token: accessToken,
      expires_in: accessTokenExpiredAt,
    } = await this.request(options);

    this.accessToken = accessToken;
    this.accessTokenExpiredAt = Date.now() + accessTokenExpiredAt * 1000;
  }

  async request(payload, inRetries = 0) {
    try {
      this.log(payload);
      const { data } = await axios(payload);
      return data;
    } catch (e) {
      this.log(e);

      if (e.response && e.response.status === 403 && inRetries < MAX_RETRIES) {
        this.log('Retry for 403');
        Object.assign(payload, {
          headers: await this.getApiHeaders(true),
        });
        return this.request(payload, inRetries + 1);
      }

      if (e.response && e.response.data && e.response.data.message) {
        throw new Error(e.response.data.message);
      }

      throw new Error(e.toJSON().message);
    }
  }

  async estimateFee(order) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/orders/fee`,
      data: order,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async estimateTime(order) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/orders/time`,
      data: order,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async submitOrder(order) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/orders`,
      data: order,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async getOrder(orderId) {
    const { apiUrl } = this;
    const options = {
      method: 'GET',
      url: `${apiUrl}/orders/${orderId}`,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
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
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async getOrderCurrentCourierLocation(orderId) {
    const { apiUrl } = this;
    const options = {
      method: 'GET',
      url: `${apiUrl}/orders/${orderId}/coordinates`,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async callback(event) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/callback`,
      data: event,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async createOrUpdateOutlet(id, outlet) {
    const { apiUrl } = this;
    const options = {
      method: 'PUT',
      url: `${apiUrl}/outlets/${id}`,
      data: outlet,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async getOutlet(id) {
    const { apiUrl } = this;
    const options = {
      method: 'GET',
      url: `${apiUrl}/outlets/${id}`,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }
};
