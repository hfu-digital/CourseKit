import { describe, expect, it } from 'bun:test';
import { StarPlanClient } from '../client/starplan-client.js';

const jsonResponse = (value: unknown) =>
    new Response(JSON.stringify(value), {
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });

describe('StarPlanClient', () => {
    it('fetches programs and semesters using the StarPlan JSON contract', async () => {
        const requests: string[] = [];
        const client = new StarPlanClient({
            baseUrl: 'https://splan.example.test/starplan/',
            planningUnit: '5',
            fetchImpl: async (input) => {
                const url = String(input);
                requests.push(url);
                if (url.includes('getogs')) {
                    return jsonResponse([[{ id: 41, name: 'Angewandte Informatik', shortname: 'AIN' }]]);
                }
                return jsonResponse([[{ id: 1742, name: 'AIN1', shortname: '1' }]]);
            },
        });

        await expect(client.fetchPrograms()).resolves.toEqual([
            { id: '41', name: 'Angewandte Informatik', shortName: 'AIN' },
        ]);
        await expect(client.fetchSemesters('41')).resolves.toEqual([
            { id: '1742', programId: '41', name: 'AIN1', shortName: '1' },
        ]);
        expect(requests).toEqual([
            'https://splan.example.test/starplan/json?m=getogs',
            'https://splan.example.test/starplan/json?m=getPgsExt&pu=5&og=41',
        ]);
    });

    it('preserves source lecture metadata with stable normalized fields', async () => {
        const client = new StarPlanClient({
            baseUrl: 'https://splan.example.test/starplan',
            planningUnit: '5',
            fetchImpl: async () =>
                jsonResponse([
                    [
                        {
                            id: 1742,
                            name: 'AIN1',
                            shortname: '1',
                            lectures: [
                                { id: 9001, name: 'Datenbanken', shortname: 'DB' },
                                { id: '9002', name: 'Programmierung', code: 'PRG' },
                                { name: 'Ohne Code' },
                            ],
                        },
                    ],
                ]),
        });

        await expect(client.fetchSemesters('41')).resolves.toEqual([
            {
                id: '1742',
                programId: '41',
                name: 'AIN1',
                shortName: '1',
                lectures: [
                    { id: '9001', name: 'Datenbanken', code: 'DB' },
                    { id: '9002', name: 'Programmierung', code: 'PRG' },
                    { name: 'Ohne Code' },
                ],
            },
        ]);
    });

    it('builds the canonical semester iCal URL and decodes ISO-8859-1 data', async () => {
        const latin1 = Uint8Array.from([
            66,
            69,
            71,
            73,
            78,
            58,
            86,
            67,
            65,
            76,
            69,
            78,
            68,
            65,
            82,
            10,
            83,
            85,
            77,
            77,
            65,
            82,
            89,
            58,
            77,
            97,
            114,
            122,
            10,
            69,
            78,
            68,
            58,
            86,
            67,
            65,
            76,
            69,
            78,
            68,
            65,
            82,
        ]);
        let requestedUrl = '';
        const client = new StarPlanClient({
            baseUrl: 'https://splan.example.test/starplan',
            planningUnit: '5',
            fetchImpl: async (input) => {
                requestedUrl = String(input);
                return new Response(latin1, {
                    headers: { 'content-type': 'text/calendar; charset=iso-8859-1' },
                });
            },
        });

        await expect(client.fetchIcal('1742')).resolves.toContain('SUMMARY:Marz');
        expect(requestedUrl).toBe(
            'https://splan.example.test/starplan/ical?lan=de&puid=5&type=pg&pgid=1742',
        );
        expect(client.getIcalUrl('semester/1742')).toBe(
            'https://splan.example.test/starplan/ical?lan=de&puid=5&type=pg&pgid=semester%2F1742',
        );
    });

    it('throws a useful error for non-successful responses', async () => {
        const client = new StarPlanClient({
            baseUrl: 'https://splan.example.test/starplan',
            planningUnit: '5',
            fetchImpl: async () => new Response('unavailable', { status: 503, statusText: 'Unavailable' }),
        });

        await expect(client.fetchIcal('1742')).rejects.toThrow('HTTP 503: Unavailable');
    });
});
