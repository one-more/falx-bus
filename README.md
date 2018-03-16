# falx-bus
modify state on server avoiding tedious 
REST endpoints.

designed to be used with [falx](https://github.com/one-more/falx)

## installation
````
npm i -S falx-bus
````

# usage
## FRONT-END
````es6
import {use, register, store} from 'falx'
import {busMiddleware, backendAction, applyAction} from 'falx-bus'

// transport protocol between client & server
const Transport = {
    /* could be action filtering there */
    send(state, action) {
        api.send('/bus', {state, action})
        /* or return promise with result
        return api.send('/bus', {state, action})
        */
    }
}
use(busMiddleware(Transport));

/* 
could be any transport. 
isn't required - result could be returned by Transport.send
*/
const evtSource = new EventSource("/bus");
evtSource.onmessage = function(e) {
    // apply server changed state
    store.dispatch(applyAction(e.data))
}

const user = {
    state: {
        id: undefined,
        login: undefined,
        email: undefined,
        errors: {}
    },
    actions: {
        login: backendAction(),
        logout: backendAction()
    }
};

const notifications = {
    state: []
};

register('user', user);
register('notifications', notifications);

// ....
store.user.login(login, password);

// ....
store.user.logout();
````

## BACKEND
```` es6
import {backendMiddleware} from 'falx-bus'
import {use} from 'falx'

const backend = {
    user: {
        login(state, login, password, actions) {
            return loginUserApi(login, password).then(user => {
                actions.notifications.add('login notification');
                return {
                    ...state,
                    ...user
                }
            }).catch(errors => ({
                ...state,
                errors
            }))
        },
        logout(state, actions) {
            actions.notifications.clear();
            return {
                ...state,
                id: undefined,
                login: undefined,
                email: undefined,
                errors: {}
            }
        }
    },
    notifications: {
        add(state, notification) {
            return state.concat(notification)
        },
        clear() {
            return []
        }
    }
};

// with server-side store
use(backendMiddleware(backend))
function handleBusAction(state, action) {
    store.dispatch(action).then(() => {
        sendServerEvent(store.getState())
    })
}


// without server-side store
const back = backendMiddleware(backend);
function handleBusAction(state, action) {
    back(null, state, action).then(newState => {
        sendServerEvent(newState)
    })
}
````

#API
### backendAction()
empty falx action

### applyAction(state: any)
apply server changed state

### busMiddleware(transport: Transport)
````es6
type Transport = {
    send: (state: any, action: Object) => ?Promise<any>
}
````
client side middleware. sends all actions by transport to the backend.

### backendMiddleware(backend: Object)
backend side actions. could be used as middleware with falx on server or as standalone action handler.
example:
````es6
const backend = {
    user: {
        login(state, login, password, actions) {
            return loginUserApi(login, password).then(user => {
                actions.notifications.add('login notification');
                return {
                    ...state,
                    ...user
                }
            }).catch(errors => ({
                ...state,
                errors
            }))
        },
        logout(state, actions) {
            actions.notifications.clear();
            return {
                ...state,
                id: undefined,
                login: undefined,
                email: undefined,
                errors: {}
            }
        }
    },
    notifications: {
        add(state, notification) {
            return state.concat(notification)
        },
        clear() {
            return []
        }
    }
};

use(backendMiddleware(backend))
// or
const back = backendMiddleware(backend);
// ....
back(null, state, action)
````
