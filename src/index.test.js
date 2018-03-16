import EventEmitter from 'events'
import {register, use, store} from 'falx'

import {busMiddleware, backendAction, applyAction, backendMiddleware} from './index'

const emitter = new EventEmitter;
const action_send = 'ACTION_SEND';
const action_apply = 'ACTION_APPLY';

const returnPromiseWithResult = jest.fn();

const Transport = {
    send(state, action) {
        if (action.type === 'logout') {
            returnPromiseWithResult();
            return back(null, state, action)
        }
        emitter.emit(action_send, {state, action});
    },
    subscribe() {
        emitter.on(action_apply, state => {
            store.dispatch(applyAction(state))
        })
    }
};

use(busMiddleware(Transport));

Transport.subscribe();

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

const loginUserApi = (login, pass) => {
    if (login === pass) {
        return Promise.resolve({
            id: 1,
            login,
            email: login
        })
    }
    return Promise.reject({
        login: 'incorrect login',
        password: 'incorrect password'
    })
};

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

const back = jest.fn(
    backendMiddleware(backend)
);

emitter.on(action_send, ({state, action}) => {
    back(null, state, action).then(res => {
        emitter.emit(action_apply, res)
    })
});

const createPromise = () => new Promise(resolve => {
    setTimeout(resolve, 1000)
});

describe('falx bus', () => {
    it('login action', () => {
        const admin = 'admin';
        store.user.login(admin, admin);
        return createPromise().then(() => {
            expect(store.user.user).toEqual({
                id: 1,
                login: admin,
                email: admin,
                errors: {}
            });
            expect(store.notifications.notifications).toEqual(
                ['login notification']
            )
        })
    });

    it('logout', () => {
        store.user.logout();
        return createPromise().then(() =>{
            expect(returnPromiseWithResult).toHaveBeenCalled()
        })
    });

    it('login error', () => {
        store.user.login('admin', '123456');
        return createPromise().then(() => {
            expect(store.user.user).toEqual({
                id: undefined,
                login: undefined,
                email: undefined,
                errors: {
                    login: 'incorrect login',
                    password: 'incorrect password'
                }
            });
            expect(store.notifications.notifications).toEqual(
                []
            );
            expect(back).toHaveBeenCalledTimes(5)
        })
    })
});