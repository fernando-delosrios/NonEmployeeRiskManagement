import { Attributes } from '@sailpoint/connector-sdk'

export class Profile {
    identity: string
    uuid: string
    attributes: Attributes
    type: string

    constructor(profile: any, type: string) {
        this.attributes = {
            id: profile.id,
            name: profile.name,
        }

        this.type = type
        this.identity = this.attributes.id as string
        this.uuid = this.attributes.name as string
    }
}
