import {urlForPath} from "./cdkOuputs";

const ADMIN_EMAIL = 'jeff@goblinoid.co.uk'
const ADMIN_PASSWORD = 'changeme1234'

function keyFromCookie(setCookieHeader: string) {
    return setCookieHeader.split(';')[0];
}

async function loginAsAdmin() {
    const response = await fetch(
        await urlForPath('/auth/login'),
        {
            method: 'POST',
            body: JSON.stringify({email: ADMIN_EMAIL, password: ADMIN_PASSWORD})
        }
    );

    expect(response.status).toBe(200);

    const cookieHeader = response.headers.get('set-cookie');
    if(!cookieHeader) {
        throw new Error('No cookie header')
    }

    return keyFromCookie(cookieHeader);
}

export async function ensureUserDeleted(email: string) {
    const key = await loginAsAdmin();

    // First check if the user exists
    const fetchRes = await fetch(
        await urlForPath(`/admin/auth/user/${email}`),
        {headers: {Cookie: key}}
    );

    if (fetchRes.status === 200) {
        const deleteRes = await fetch(
            await urlForPath(`/admin/auth/user/${email}`),
            {
                method: 'DELETE',
                headers: {Cookie: key}
            }
        );
        const deleteBody = await deleteRes.json()
        expect(deleteBody.statusCode ?? deleteRes.status).toBe(200);
    }
}

export async function verifyUser(email: string) {
    const key = await loginAsAdmin();

    const res = await fetch(
        await urlForPath(`/admin/auth/verify/${email}`),
        {
            method: 'POST',
            headers: {Cookie: key}
        }
    );

    expect(res.status).toBe(200);
    expect((await res.json())?.statusCode ?? 200).toEqual(200);
}
