import { Attributes } from '@sailpoint/connector-sdk'

export class Account {
    identity: string
    uuid: string
    attributes: Attributes
    disabled? = false

    constructor(account: any) {
        if (account.type === 'NeaccessUser') {
            this.attributes = account
        } else {
            this.attributes = account.attributes
            this.attributes.id = account.id
            this.attributes.name = account.name
        }

        this.disabled = account.status && account.status !== 'Active'
        this.identity = this.attributes.id as string
        this.uuid = this.attributes.name as string
    }
}
