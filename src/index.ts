import {
    Context,
    createConnector,
    readConfig,
    Response,
    logger,
    StdAccountListOutput,
    StdTestConnectionOutput,
    StdAccountListInput,
    StdAccountReadInput,
    StdAccountReadOutput,
    StdAccountDiscoverSchemaOutput,
    StdEntitlementListInput,
    StdEntitlementListOutput,
} from '@sailpoint/connector-sdk'
import { NERMClient } from './nerm'
import { Account } from './model/account'
import { AxiosResponse } from 'axios'
import { Profile } from './model/profile'

const urlToID = (url: string): string => {
    const id = url.split('/').pop()
    return id ? id : ''
}

// Connector must be exported as module property named connector
export const connector = async () => {
    const getProfileTypeId = async (name: string): Promise<string> => {
        let id = ''
        try {
            const response = await client.getProfileType(name)
            id = response.data.profile_types[0].id
        } catch (error) {
            throw new Error(`Profile type ${profile} not found`)
        }

        return id
    }

    const buildAccount = async (
        profile: any,
        profileAttributes: any[],
        profileMap?: { [key: string]: string }
    ): Promise<Account> => {
        if (!profileMap) {
            profileMap = {}
        }
        const account = new Account(profile)
        for (const attribute of profileAttributes) {
            const value = account.attributes[attribute.uid] as string
            if (value) {
                const profileIds: string[] = []
                account.attributes[attribute.uid] = []
                const profileNames = value.split(',')
                for (const profileName of profileNames) {
                    let profileId: string
                    if (profileMap[profileName]) {
                        profileId = profileMap[profileName]
                    } else {
                        const response = await client.listProfiles({
                            profile_type_id: attribute.profile_type_id,
                            name: profileName,
                        })
                        profileId = response.data.profiles[0].id
                        profileMap[profileName] = profileId
                    }
                    profileIds.push(profileId)
                }
                account.attributes[attribute.uid] = profileIds
            }
        }

        return account
    }

    const getProfileAttributes = async (profileIds: string[]): Promise<any[]> => {
        const response = await client.listAttributes()
        const attributes = response.data.ne_attributes.filter((x: { profile_type_id: string }) =>
            profileIds.includes(x.profile_type_id)
        )

        return attributes
    }

    // Get connector source config
    const config = await readConfig()
    const { mode, profile, filter, groups } = config
    // Use the vendor SDK, or implement own client as necessary, to initialize a client
    const client = new NERMClient(config)

    /////////////////////////////////////////////////////////////////////////////////////////////////////

    return createConnector()
        .stdTestConnection(async (context: Context, input: undefined, res: Response<StdTestConnectionOutput>) => {
            logger.info('Running test connection')
            const response = await client.getOneUser()
            res.send({})
        })
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            let response: AxiosResponse
            const accounts: Account[] = []
            switch (mode) {
                case 'user':
                    response = await client.listUsers()
                    const users = response.data.users
                    for (const user of users) {
                        const account = new Account(user)
                        accounts.push(account)
                    }
                    break

                case 'profile':
                    const profile_type_id = await getProfileTypeId(profile)
                    // if (filter) {
                    //     response = await client.searchProfiles(filter)
                    // } else {
                    //     response = await client.listProfiles({ profile_type_id })
                    // }
                    response = await client.listProfiles({ profile_type_id })

                    const profiles = response.data.profiles
                    let profileAttributes = []
                    if (groups) {
                        const profileTypeIds = await Promise.all(groups.map((x: string) => getProfileTypeId(x)))
                        profileAttributes = await getProfileAttributes(profileTypeIds)
                    }

                    const profileMap: { [key: string]: string } = {}
                    for (const profile of profiles) {
                        const account = await buildAccount(profile, profileAttributes, profileMap)
                        accounts.push(account)
                    }

                    break
                default:
                    break
            }

            for (const account of accounts) {
                logger.info(account)
                res.send(account)
            }
        })
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            logger.info(input)
            let response: AxiosResponse
            let account: Account
            switch (mode) {
                case 'user':
                    response = await client.getUser(input.identity)

                    const user = response.data.user
                    account = new Account(user)

                    logger.info(account)
                    res.send(account)
                    break

                case 'profile':
                    response = await client.getProfile(input.identity)

                    const profile = response.data.profile
                    let profileAttributes = []
                    if (groups) {
                        const profileTypeIds = await Promise.all(groups.map((x: string) => getProfileTypeId(x)))
                        profileAttributes = await getProfileAttributes(profileTypeIds)
                    }

                    account = await buildAccount(profile, profileAttributes)
                    logger.info(account)
                    res.send(account)

                    break
                default:
                    break
            }
        })
        .stdEntitlementList(
            async (context: Context, input: StdEntitlementListInput, res: Response<StdEntitlementListOutput>) => {
                logger.info(input)

                switch (mode) {
                    case 'profile':
                        if (!groups || !groups.includes(input.type)) {
                            const message = `${input.type} entitlement not included in associated profile names list`
                            logger.error(message)
                            throw new Error(message)
                        } else {
                            const profile_type_id = await getProfileTypeId(input.type)
                            const response = await client.listProfiles({ profile_type_id })

                            for (const rawProfile of response.data.profiles) {
                                const profile = new Profile(rawProfile, input.type)
                                logger.info(profile)
                                res.send(profile)
                            }
                        }
                        break

                    default:
                        break
                }
            }
        )
        .stdAccountDiscoverSchema(
            async (context: Context, input: undefined, res: Response<StdAccountDiscoverSchemaOutput>) => {
                let response: AxiosResponse | undefined
                const schema: any = {
                    identityAttribute: 'id',
                    displayAttribute: 'name',
                    attributes: [],
                }
                switch (mode) {
                    case 'user':
                        response = await client.getOneUser()
                        const user = response.data.users[0]
                        for (const key of Object.keys(user)) {
                            schema.attributes.push({
                                name: key,
                                type: 'string',
                                description: key,
                            })
                        }
                        break

                    case 'profile':
                        const profile_type_id = await getProfileTypeId(profile)
                        response = await client.listProfiles({ profile_type_id })
                        const profiles: any[] = response.data.profiles
                        const attributes = profiles.reduce((p, { attributes: c }) => ({ ...p, ...c }), {})
                        attributes.id = null
                        attributes.name = null
                        let ne_attributes = []
                        const profileTypeMap: { [key: string]: string } = {}
                        if (groups) {
                            for (const group of groups) {
                                const id = await getProfileTypeId(group)
                                profileTypeMap[id] = group
                            }

                            response = await client.listAttributes()
                            ne_attributes = response.data.ne_attributes.filter(
                                (x: { profile_type_id: string }) => profileTypeMap[x.profile_type_id]
                            )
                        }
                        for (const key of Object.keys(attributes)) {
                            const ne_attribute = ne_attributes.find((x: { uid: string }) => x.uid === key)
                            if (ne_attribute) {
                                schema.attributes.push({
                                    name: key,
                                    type: 'string',
                                    description: key,
                                    managed: true,
                                    entitlement: true,
                                    multi: true,
                                    schemaObjectType: profileTypeMap[ne_attribute.profile_type_id],
                                })
                            } else {
                                schema.attributes.push({
                                    name: key,
                                    type: 'string',
                                    description: key,
                                })
                            }
                        }
                        break

                    default:
                        break
                }

                logger.info(schema)
                res.send(schema)
            }
        )
}
