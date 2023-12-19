import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios'

export class NERMClient {
    private client: AxiosInstance

    constructor(config: any) {
        const baseConfig: AxiosRequestConfig = {
            baseURL: config.url,
            headers: {
                Authorization: `Bearer ${config.token}`,
                Accept: 'application/json',
            },
        }
        this.client = axios.create(baseConfig)
    }

    async getOneUser(): Promise<AxiosResponse> {
        const url = `/users`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
            params: {
                'query[limit]': 1,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async listUsers(): Promise<AxiosResponse> {
        const url = `/users`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async getUser(id: string): Promise<AxiosResponse> {
        const url = `/users/${id}`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async listProfiles(params?: any): Promise<AxiosResponse> {
        const url = `/profiles`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
            params,
        }

        const response = await this.client.request(request)

        return response
    }

    async searchProfiles(filter: string): Promise<AxiosResponse> {
        const url = `/profiles`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }
        const response = await this.client.request(request)

        return response
    }

    async getProfile(id: string): Promise<AxiosResponse> {
        const url = `/profiles/${id}`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async getProfileType(name: string): Promise<AxiosResponse> {
        const url = `/profile_types`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
            params: {
                name,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async listAttributes(): Promise<AxiosResponse> {
        const url = `/ne_attributes`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }
}
