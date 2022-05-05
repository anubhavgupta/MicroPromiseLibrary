class Later {
    static STATES = {
        pending: 'pending',
        rejected: 'rejected',
        resolved: 'resolved'
    }
    
    constructor ({callback} = {}) {
        this.state =  Later.STATES.pending;
        this.callback = callback || {}; //?
        this.queue = []; // can we use microQueue.
        this.data = undefined;
    }

    _isPromiseLike(data) {
        return !!data?.then;
    }

    
    // already resolved/rejected
    _recursiveResolve(data, cb, forceNotPromise = false) {
        if(this._isPromiseLike(data) && !forceNotPromise) {
            data
            .then((_data)=>{
                this._recursiveResolve(_data, cb);
            }, (_data) => {
                this._recursiveResolve(_data, cb, true);
            });
        } else {
            cb(data, forceNotPromise ? Later.STATES.rejected : Later.STATES.resolved);
        }
    }

    _executeCallback = (state, data) => {
        const fnTocall = this.callback[state] || this.callback['finally']; 
        if(fnTocall) {
            queueMicrotask(()=>{
                try {
                    const dataForNext = fnTocall.call(null, this.callback[state] ? data : undefined);
                    this._complete({
                        state: Later.STATES.resolved,
                        data: dataForNext
                    });
                } catch(ex) {
                    this._complete({
                        state: Later.STATES.rejected,
                        data: ex
                    });
                }
            });
        }

    }

    _executeDependentPromises() {
        // TODO check if we need to bind this fn.
        if(this.queue.length && this.state !== Later.STATES.pending) {
            const pendingPromiseCallBack = this.queue.shift();
            pendingPromiseCallBack(this.state, this.data);
            this._executeDependentPromises();
        }
    }

    _complete({state, data}) {
        if(state && this.state === Later.STATES.pending) {
            this._recursiveResolve(data, (resolvedData, updatedState)=>{
                this.state = state === Later.STATES.rejected ? Later.STATES.rejected : updatedState;
                this.data = resolvedData; 
                this._executeDependentPromises();
            });
        }
    }

    _resolve(data) {
        this._complete({
            state: Later.STATES.resolved,
            data
        });
    }

    _reject(data) {
        this._complete({
            state: Later.STATES.rejected,
            data
        });
    }

    _registerCallBacks(callbackMap) {
        const newPromise = new Later({
            callback: callbackMap
        });

        this.queue.push(newPromise._executeCallback);
        this._executeDependentPromises();

        return newPromise;
    }

    then(successFn, failFn) {
        return this._registerCallBacks({
            [Later.STATES.resolved]: successFn,
            [Later.STATES.rejected]: failFn
        });
    }

    catch(failFn) {
        return this._registerCallBacks({
            [Later.STATES.rejected]: failFn
        });
    }

    finally(finallyFn) {
        return this._registerCallBacks({
            ['finally']: finallyFn
        });
    }
}

class LaterMaker {
    constructor(initFn) {
        const newPromise = new Later();
        initFn(newPromise._resolve.bind(newPromise), newPromise._reject.bind(newPromise));
        return newPromise;
    }
    static resolve(data) {
        const newPromise = new Later();
        newPromise._resolve(data);
        return newPromise;
    }
    static reject(data) {
        const newPromise = new Later();
        newPromise._reject(data);
        return newPromise;
    }
    static all(listOfPromises) {
        //...
    }
}

/**
 * Spec:
 * 1> as a thenable:
 * p1.then(s,f) -> returns a new promise, which is controlled by 
 * // when p1 completes, based on if it was rejected | resolved run cb of p2(success|fail)  based on output and if no errors are thrown then either resolve or reject the promise.
 * 2> new Promise(fn(res,rej)) -> returns a new promise, which is controlled by init fn and res, rej passed to it.
 * 
 * 
 * {
 *  initCBFn: (...args)=>{},
 *  data: <any>,
 *  state: <pending|reject|resolve>
 * }
 * 
 * // p1 flow:
 * initCBFn is called by p1 and then based on how the execution goes, the new promise is either rejected or resolved.
 * 
 * // p2 flow:
 *  special constructor fn is called with the new promise's res and rej fn. No callback is registered. Once the promise is completed
 * all the registered callbacks are called.
 * 
 */
