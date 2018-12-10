'use strict';

// Reference: https://gist.github.com/kaizhu256/4482069
const uuidv4 = () => {
  // return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  let uuid = '', ii;
  for (ii = 0; ii < 32; ii += 1) {
    switch (ii) {
    case 8:
    case 20:
      uuid += '-';
      uuid += (Math.random() * 16 | 0).toString(16);
      break;
    case 12:
      uuid += '-';
      uuid += '4';
      break;
    case 16:
      uuid += '-';
      uuid += (Math.random() * 4 | 8).toString(16);
      break;
    default:
      uuid += (Math.random() * 16 | 0).toString(16);
    }
  }
  return uuid;
}

const fireEvent = async (endpoint, uid, category, action, label) => {
  const event = {
    ts: (new Date).getTime(),
    uid,
    category,
    action,
    label
  };

  const result = await fetch(endpoint, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({payload:[event]})
  });

  if (!result.ok) {
    throw new Error(result.statusText);
  }
  return event;
}

document.addEventListener('DOMContentLoaded', (event) => {
  const app = new Vue({
    el: '#app',
    data: {
      endpoint: 'COLLECTOR_ENDPOINT',
      uid: uuidv4(),
      errorMessage: '',
      firedEvents: []
    },
    methods: {
      getNewUid: function () {
        this.uid = uuidv4()
      },
      fireViewEvents: async function () {
        this.errorMessage = '';
        try {
          const event = await fireEvent(this.endpoint, this.uid, 'page', 'view', 'home');
          this.firedEvents.push(event);
        } catch (err) {
          this.errorMessage = err.message;
        }
      },
      fireClickEvents: async function () {
        this.errorMessage = '';
        try {
          const event = await fireEvent(this.endpoint, this.uid, 'button', 'click', 'example');
          this.firedEvents.push(event);
        } catch (err) {
          this.errorMessage = err.message;
        }
      }
    }
  });
});
