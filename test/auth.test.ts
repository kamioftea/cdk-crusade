import {expect, test as it, describe, beforeAll} from '@jest/globals';
import {urlForPath} from "./helpers/cdkOuputs";
import {ensureUserDeleted, verifyUser} from "./helpers/userUtils";

const USER_EMAIL = 'contact@jeff-horton.uk';
const USER_NAME = 'Jeff Horton';
const USER_PASSWORD = 'BasicPassword123!';

describe('End-to-end sign-up and login flow', () => {
    beforeAll(async () => {
        await ensureUserDeleted(USER_EMAIL);
    });

    it('should sign up a user', async () => {
        const url = await urlForPath('/auth/sign-up');
        const response = await fetch(
            url,
            {
                method: 'POST',
                body: JSON.stringify({email: USER_EMAIL, name: USER_NAME, password: USER_PASSWORD})
            }
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({email: USER_EMAIL, name: USER_NAME});

        await verifyUser(USER_EMAIL);
    });

    it('should log in a user', async () => {
        const url = await urlForPath('/auth/login');
        const response = await fetch(
            url,
            {
                method: 'POST',
                body: JSON.stringify({email: USER_EMAIL, password: USER_PASSWORD})
            }
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({email: USER_EMAIL});
    });
});
