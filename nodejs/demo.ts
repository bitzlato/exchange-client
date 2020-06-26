#!/usr/bin/env node

const restHost = "https://bitzlato.com";
const grpcHost = "grpc.bitzlato.com:443";
const grpcTls = true;

// const grpcHost = "localhost:6565";
// const grpcTls = false;

const pair = "ETH-BTC";

import * as debug from "debug";
import * as grpc from "grpc";

import {Candlestick, SubscribeReq, Width} from "bitzlato-node-client/exchange/candlestick_pb";

import {ServiceClient as OhlcvClient} from "bitzlato-node-client/exchange/candlestick_grpc_pb";

import {ServiceClient as DepthClient} from "bitzlato-node-client/exchange/market-depth_grpc_pb"

import {SideDepth, SideReq, SortKind} from "bitzlato-node-client/exchange/market-depth_pb";

import {OrderSide} from "bitzlato-node-client/exchange/common_pb";

import {MarketsClient} from "bitzlato-node-client/exchange/market_grpc_pb"

import {MarketsList} from "bitzlato-node-client/exchange/market_pb";

import {ServiceClient as PairClient} from "bitzlato-node-client/exchange/pair_grpc_pb"

import {PairInfo, PairRequest} from "bitzlato-node-client/exchange/pair_pb"

import {Empty} from "google-protobuf/google/protobuf/empty_pb";

import axios, {Method} from "axios";

debug.enable('demo:*');

let tls = grpcTls ? grpc.credentials.createSsl() : grpc.credentials.createInsecure();

const ohlcvClient = new OhlcvClient(grpcHost, tls);
const depthClient = new DepthClient(grpcHost, tls);
const marketsClient = new MarketsClient(grpcHost, tls);
const pairClient = new PairClient(grpcHost, tls);

const NOTHING = new Empty();

const token = "9fbfabf0-1372-4b32-bcda-23430fcb95bd";

interface OrderDTO {
    type: string;
    price: number;
    side: string;
    pair: string;
    amount: number;
}

interface WalletDTO {
    cryptocurrency: string;
    balance: string;
    holdBalance: string;
    address: string | null;
    createdAt: number;
    worth: any
}


/* export type Method =
  | 'get' | 'GET'
  | 'delete' | 'DELETE'
  | 'head' | 'HEAD'
  | 'options' | 'OPTIONS'
  | 'post' | 'POST'
  | 'put' | 'PUT'
  | 'patch' | 'PATCH' */

interface OrderDTO {
    id: number,
    created: number,
    pair: string,
    side: string,
    type: string,
    price: number,
    baseAmount: number,
    quoteAmount: number,
    amountType: string,
    filledAmount: number,
    fee: number,
    status: string
}

const marketDepth = async (pair: string) => {
    return new Promise((resolve, reject) => {
        const req = new SideReq();
        req.setPair(pair);
        req.setScale(-5);
        req.setLimit(10);
        req.setSide(OrderSide.SELL);
        req.setSortKind(SortKind.DESC);

        const log = debug("demo: Market Depth");

        log(`Request: ${JSON.stringify(req.toObject())}`);

        depthClient.get(req, (err, ask: SideDepth | undefined) => {
            if (err != null) {
                log(`error:\n   message: ${err.message}\n   stack:\n${err.stack}`);
                reject(err);
                return;
            }
            log(`ASK: ${JSON.stringify(ask!.toObject(), null, 2)}`);
            resolve(ask);
        });
    });
};

const realtimeOhlcv = async (pair: string) => {
    return new Promise((resolve, reject) => {
        const rtReq = new SubscribeReq();
        rtReq.setPair(pair);
        rtReq.setWidth(Width.MINUTE);

        const log = debug("demo: OHLCV");
        log(`Subscribe: ${JSON.stringify(rtReq.toObject())}`);

        const subscription = ohlcvClient.realtime(rtReq, (err, subs) => {
            if (err != null) {
                log(
                    `error:\n   message: ${err.message}\n   stack:\n${err.stack}`
                );
                reject(err);
                return;
            }
            log(`Subscribed: ${JSON.stringify(subs.toObject(), null, 2)}`);
            resolve(subs);
        });

        return subscription.on("data", (ohlcv: Candlestick) => {
                log("~~~~~~~~~~~~~~~~~~~~~~~~");
                log(`${JSON.stringify(ohlcv.toObject(), null, 2)}`);
            }
        );
    });
};

async function spotMarkets() {
    const log = debug("demo: Markets");

    return new Promise((resolve, reject) => {
        marketsClient.getAll(NOTHING, (err, ok: MarketsList | undefined) => {
            if (err != null) {
                log(`error:\n   message: ${err.message}\n   stack:\n${err.stack}`);
                reject(err);
                return;
            }
            log(`${JSON.stringify(ok!.toObject(), null, 2)}`);
            resolve(ok);
        });
    });
}

async function pairInfo(pair: string) {
    const log = debug("demo: Pair");

    return new Promise((resolve, reject) => {
        const req = new PairRequest();
        req.setPair(pair);

        pairClient.getSingleInfo(req, (err, ok: PairInfo | undefined) => {
            if (err != null) {
                log(`error:\n   message: ${err.message}\n   stack:\n${err.stack}`);
                reject(err);
                return;
            }
            log(`${JSON.stringify(ok!.toObject(), null, 2)}`);
            resolve(ok);
        });
    });
}


async function makeRequest<T>(url: string, method: Method = "GET", data: any | null = null, requestToken: string | null = token): Promise<T> {
    return axios
        .request<T>({
            url: url,
            method: method,
            headers: {
                "X-Authorization": requestToken,
                "Content-Type": "application/json; charset=UTF-8"
            },
            data: data
        })

        .then(response => response.data);
}

async function main() {
    // // get userId
    // const userId = await makeRequest<number>(`${restHost}/api/market/v1/private/whoami`);
    // // get balance
    // const balanceDto = await makeRequest<WalletDTO>(`${restHost}/api/p2p/${userId}/wallets/BTC`);
    // const balance = Number(balanceDto.balance);
    //
    // const legacy = debug("demo: Legacy RESTful API");
    //
    // legacy(`userId = ${userId}`);
    // legacy(`Balance= ${balance}`);
    //
    // // create order
    // const createOrderData = {
    //     "type": "limit",
    //     "price": 0.02,
    //     "side": "buy",
    //     "pair": `${pair}`,
    //     "amount": 1
    // };
    // const order = await makeRequest<OrderDTO>(`${restHost}/api/market/v1/private/${userId}/orders/`, "POST", createOrderData);
    // const orderId = order.id;
    // legacy(`orderId=${orderId}`);
    // // get list of orders
    // const ordersList = await makeRequest(`${restHost}/api/market/v1/private/${userId}/orders/`);
    // legacy(' ==== ORDERS === ');
    // legacy(ordersList);
    // legacy(' ================ \n\n');
    // const sc = await makeRequest(`${restHost}/api/market/v1/private/${userId}/orders/${order.id}`, "DELETE");
    // legacy(`Order ${order.id} canceled: ${sc}`);

    const sep = debug("demo:");

    sep(' === SPOT MARKETS ==== ');
    await spotMarkets();
    sep(' ===================== \n\n');

    sep(' ===   PAIR INFO  ==== ');
    await pairInfo(pair);
    sep(' ===================== \n\n');

    sep(' ==== MARKET DEPTH === ');
    await marketDepth(pair);
    sep(' ===================== \n\n');

    sep(' ==== LISTEN INCOMING STREAM OF CANDLESTICKS === ');
    await realtimeOhlcv(pair);
}

main().then(_ => _);

const error = debug("demo: Error");
process.on("uncaughtException", err => {
    error(`process on uncaughtException error: ${err}`);
});

process.on("unhandledRejection", err => {
    error(`process on unhandledRejection error: ${err}`);
});
