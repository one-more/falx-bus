// @flow

import invariant from 'invariant'

export type Transport = {
    send: (state: any, action: Object) => ?Promise<any>
}

export function backendAction() {
    return (state: any) => state;
}

const APPLY_ACTION_TYPE = 'APPLY_STATE_ACTION';

export function applyAction(state: any) {
    return {
        type: APPLY_ACTION_TYPE,
        payload: state
    }
}

export function busMiddleware(transport: Transport): Function {
    return function (store: any, promise: Promise<any>, action: any) {
        if (action.type === APPLY_ACTION_TYPE) {
            return action.payload
        }
        return promise.then(state => {
            return transport.send(state, action) || state;
        })
    }
}

export function backendMiddleware(reducers: Object): Function {
    invariant(typeof reducers === 'object', 'reducers must be an object');
    return function (store: any, promise: Promise<any>, action: any) {
        return Promise.resolve(promise).then(state => {
            const actions = makeActions(reducers, state);
            for (let i in actions) {
                for (let j in actions[i]) {
                    const handler = actions[i][j];
                    if (action.type === j) {
                        return handler(
                            ...action.payload
                        )
                    }
                }
            }
            return state
        })
    }
}

function makeActions(reducers: Object, state: any) {
    const actions = {};
    for (let i in reducers) {
        actions[i] = {};
        invariant(typeof reducers[i] === 'object', 'reducer must be an object');
        for (let j in reducers[i]) {
            invariant(typeof reducers[i][j] === 'function', 'action must be a function');
            actions[i][j] = (...args) => {
                return Promise.resolve(
                    reducers[i][j](state[i], ...args, actions)
                ).then(result => {
                    state[i] = result;
                    return state
                })
            }
        }
    }
    return actions
}