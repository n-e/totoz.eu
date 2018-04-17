
// TODO: do something about this
import {client} from './totoz'

export interface User {
    name:string,
    password:string,
    email:string,
    created:string,
}

export async function get_user(id: string) {
    const user:User | undefined = await client.hgetallA('user:meta:' + id)

    return user
}