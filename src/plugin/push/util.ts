/*
 * @Author: qiansc
 * @Date: 2019-05-07 14:17:18
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-12-02 14:41:08
 */
import * as prompt from 'prompt';
import { fetch } from './fetch';
import { getToken, writeToken } from './token';

type Callback = (error?: Error) => void;

const waiting: Callback[] = [];
prompt.start();

function resolve (err?: Error) {
    while (waiting.length) {
    waiting.pop()!(err);
    }
}

export function requireEmail (authApi, validateApi, prevError, cb: Callback) {
    if (!authApi || !validateApi) {
        throw new Error('options.authApi and options.validateApi is required!');
    }

    waiting.push(cb);

    if (waiting.length > 1) { // already getting
        return;
    }

    const info = getToken();
    if (info.email) {
        console.error('\nToken is invalid: ', prevError.errmsg, '\n');
    }

    prompt.get({
        properties: {
            email: {
                default: info.email,
                description: 'Enter your email',
                message: 'The specified value must be a valid email address.',
                // eslint-disable-next-line
                pattern: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
                required: true
            }
        }
    }, (error, ret) => {
        if (error) {
            return resolve(error);
        }

        info.email = ret.email;
        writeToken(info);

        fetch(authApi, {
            email: ret.email
        }, (err) => {
            if (err) {
                return resolve(error);
            }

            console.log('We\'re already sent the code to your email.');

            requireToken(validateApi, info, resolve);
        });
    });
}

function requireToken (validateApi, info, cb) {
    prompt.get({
        properties: {
            code: {
                description: 'Enter your code',
                hide: true,
                required: true
            }
        }
    }, (error, ret) => {
        if (error) {
            return cb(error);
        }

        info.code = ret.code;
        writeToken(info);
        fetch(validateApi, {
            code: info.code,
            email: info.email
        }, (err, rs) => {
            if (err) {
                return cb(err);
            }

            info.token = rs.data.token;
            writeToken(info);
            cb(null, info);
        });
    });
}

export const Text = {
    blod,
    green,
    grey,
    yellow
};

function green (str: string) {
    return '\u001b[32m' + str + '\u001b[39m';
}

function blod (str: string) {
    return '\u001b[1m' + str + '\u001b[22m';
}

function yellow (str: string) {
    return '\u001b[33m' + str + '\u001b[39m';
}

function grey (str: string) {
    return '\u001b[90m' + str + '\u001b[39m';
}

type ParallelFn = (...args: any[]) => Promise<any>;
type FinishHandle = (totalCount: number, successCount: number, failCount: number) => any;
export function parallelFactory(fn: ParallelFn, parallelCount: number, finishHandle?: FinishHandle) {
    const pool: any[][] = [];
    let executingCount = 0;
    let totalCount = 0;
    let successCount = 0;
    let failCount = 0;

    function entry(...args: any[]) {
        pool.push(args);
        exec();
    }

    function done() {
        executingCount--;
        exec();
    }

    function exec() {
        if (!pool.length && !executingCount) {
            if (finishHandle) {
                finishHandle(totalCount, successCount, failCount);
            }
            totalCount = successCount = failCount = 0;
            return;
        }

        /* eslint-disable no-loop-func */
        while (pool.length && executingCount < parallelCount) {
            executingCount++;
            totalCount++;
            const args = pool.shift()!;
            fn(...args)
                .then(() => {
                    successCount++;
                    done();
                })
                .catch(() => {
                    failCount++;
                    done();
                });
        }
        /* eslint-enable no-loop-func */
    }

    return entry;
}

export function wait(time) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}
