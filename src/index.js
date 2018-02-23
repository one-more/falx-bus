// @flow

export type Transport = {
    send: Function,
    subscribe: Function
}

export function backendAction(target: Object, key: string, descriptor: Object) {
    target[key].isBackendAction = true;
    return descriptor
}

export function busMiddleware(transport: Transport) {

}