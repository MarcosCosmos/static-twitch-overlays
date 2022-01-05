class Lease {
    constructor() {
        this.lock = new this.Lock((resolve, reject) => {
            let valid = true;
            this.isValid = () => valid;
            this.check = () => {
                if(!valid) {
                    throw new Error(this.notOwnedMessage); //throw the error to hault the caller
                }
            }
            this.break = (reason) => {
                this.check();
                valid = false;
                reject(reason);
            };
            this.release = () => {
                this.check(); //calling release twice is an error; this is not problematic like it might be within the promise 
                valid = false;
                resolve();
            }
        });
    }

    /**
     * @returns true if neither release() or break() have been called since the lease was created, otherwise returns false.
     */
    isValid(){
        throw new Error("Whoops, this prototype is just a stub. The actual method involves encapsulated data, so you'll have to override it post-construction if you want to reuse underlying behaviour!")
    }

    /**
     * @throws An error if isValid() returns false
     */
    check() {
        throw new Error("Whoops, this prototype is just a stub. The actual method involves encapsulated data, so you'll have to override it post-construction if you want to reuse underlying behaviour!")
    }

    /**
     * @throws An error if isValid() returns false
     */
    release() {
        throw new Error("Whoops, this prototype is just a stub. The actual method involves encapsulated data, so you'll have to override it post-construction if you want to reuse underlying behaviour!")
    }

    /**
     * @throws An error if isValid() returns false
     */
    break() {
        throw new Error("Whoops, this prototype is just a stub. The actual method involves encapsulated data, so you'll have to override it post-construction if you want to reuse underlying behaviour!")
    }
    
}

//todo: the chaining pattern here is a bit clunky, figure out how to make it neater with promise class extension.

/**
 * A special type of promise that can be leased (leases are like views on locks that can be checked for ownership and permit deferred/manual .release(); however the lease seperates the deferal mechanism from the lock such that not-just-anyone can resolve it.).
 * Leases inherently extend then locks lifespan in a chain, even without assignment, but the lock extends es6 promises and can be replaced/assigned in a chain like other promises.
 * However, locks are intended in general to use used in a single variable not only as a promise but also to represent mutual exclusion over a resource, and log and problems with sharing that resource. Accordingly, the builder pattern is used to create a prototype-lock for each resource, and each lock should only ever be replaced with another lock in it's own chain. Leases can be used to check the integrity of this as only locks have the .lease() method.
 * Additionally, leases can optionally be given a duration after which a warning thrown.
 * Finally, leases can be broken, causing the lock to reject.
 */
class Lock extends Promise {
    constructor(exectutor) {
        super(exectutor);
    }
    /**
     * Returns a tuple: [Promise<Lease>, leasedLock]; 
     * The first object, the promise, resolves to provide the lease, but only once this promise is resolved. 
     * The second object is the new lock that the lease controls), so that it can be chained onto before the lease is available.
     */
    lease() {
        let theLease = new this.Lease();
        return [this.then(() => theLease), theLease.lock];
    }
}

Lock.build = function(descriptor) {
    class Result extends Lock {}
    Result.prototype.descriptor = descriptor;
    Result.prototype.Lease = class extends Lease {};
    Result.prototype.Lease.prototype.notOwnedMessage=`Uh oh, I do not own the lease on lock ${descriptor}`;
    Result.prototype.Lease.prototype.Lock = Result;
    return new Result((resolve)=>{resolve()}); //auto resolved.
}

export default Lock;