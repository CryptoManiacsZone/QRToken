import {Component, NgZone, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Web3Service} from '../../util/web3.service';
import {QRTOKEN_SMART_CONTRACT_ADDRESS} from '../../util/qrtoken-smart-contract';
import {MerkleTree} from '../../util/merkle-tree';
import {Token} from '../../util/token';
import {TOKENS} from '../../util/tokens';
import {WalletService} from '../../util/wallet.service';
import {ZERO_FEE_ACCOUNT_PRIVATE_KEY} from '../../util/zero-fee-account';

declare let Buffer: any;

declare let require: any;
const qrtokenContractArtifacts = require('../../util/QRTokenABI.json');

@Component({
    selector: 'app-redeem-form',
    templateUrl: './redeem-form.component.html',
    styleUrls: ['./redeem-form.component.css']
})
export class RedeemFormComponent implements OnInit {

    loading = false;

    account;
    proof;

    tokensAmount;
    receiver;
    tokenName;
    fee = 10;
    withFee = false;
    isRedeemed;

    tokens: Token[] = TOKENS;

    fees = [
        {
            name: '2.5% Transaction Fee',
            value: 2.5
        },
        {
            name: '5% Transaction Fee',
            value: 5
        },
        {
            name: '10% Transaction Fee',
            value: 10
        },
        {
            name: '15% Transaction Fee',
            value: 15
        },
    ];

    constructor(
        private route: ActivatedRoute,
        private web3Service: Web3Service,
        private walletService: WalletService,
        private zone: NgZone
    ) {
    }

    async processParams() {

        const contract = new this.web3Service.web3.eth.Contract(qrtokenContractArtifacts, QRTOKEN_SMART_CONTRACT_ADDRESS);

        const data = this.route.snapshot.paramMap.get('data')
            .replace(/-/g, '/')
            .replace(/_/g, '+');

        const buffer = new Buffer(data, 'base64');

        const privateKey = buffer.slice(0, 32);
        this.proof = buffer.slice(32);
        let proof = this.proof;

        console.log('privateKey', privateKey.toString('hex'));

        const proofs = [];

        while (proof.slice(0, 20).length > 0) {
            const slice = proof.slice(0, 20);
            proof = proof.slice(20);

            proofs.push(slice.toString('hex'));
        }

        this.account = this.web3Service.web3.eth.accounts
            .privateKeyToAccount('0x' + privateKey.toString('hex'));

        const {root, index} = MerkleTree.applyProof(this.account.address, proofs);

        this.isRedeemed = await contract.methods
            .redeemed(
                root,
                index
            )
            .call();

        if (this.isRedeemed) {
            return;
        }

        //
        // console.log('Account', account);
        //
        // console.log('Root', '0x' + root.toString('hex'));
        // console.log('Index', index);
        //
        // console.log('proofs', proofs);

        const distribution = await contract.methods
            .distributions('0x' + root.toString('hex'))
            .call();

        console.log('distribution', distribution);

        for (const token of this.tokens) {

            if (token.address === distribution['token']) {

                this.zone.run(async () => {
                    this.tokenName = token.name;

                    const decimals = await this.walletService.getDecimals(token.address);
                    this.tokensAmount = distribution['sumAmount'] / (10 ** decimals);
                });

                break;
            }
        }
    }

    async ngOnInit() {

        this.web3Service.getAccounts()
            .subscribe(
                async (addresses) => {

                    this.receiver = addresses[0];
                    this.processParams();
                },
                async (err) => {

                    this.processParams();
                    this.withFee = true;
                }
            );
    }

    async onSubmit() {

        this.loading = true;

        const signatureObject = this.account.sign(
            this.receiver
        );

        const signature = signatureObject.signature;

        console.log('Signature', signature);
        console.log('Proof', this.proof);

        this.web3Service.getAccounts()
            .subscribe(
                async (addresses) => {

                    this.walletService
                        .transferTokensByZeroTransactionGasFee(addresses[0], signature, this.proof);

                    this.loading = false;
                },
                async (err) => {

                    const transferAccount = this.web3Service.web3.eth.accounts
                        .privateKeyToAccount(ZERO_FEE_ACCOUNT_PRIVATE_KEY);

                    this.walletService
                        .transferTokensByZeroTransactionGasFee(transferAccount.address, signature, this.proof);

                    this.loading = false;
                }
            );
    }
}