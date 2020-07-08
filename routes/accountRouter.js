import express from 'express';
import { accountModel } from '../models/account.js';

const app = express();

app.get('/', async (req, res) => {
    try {
        const account = await accountModel.find({});
        res.send(account);
    } catch (error) {
        res.status(500).send('Erro ao recuperar as contas');
    }
});

app.post('/deposit', async (req, res) => {
    try {
        let params = req.body;

        const query = { conta: params.conta };
        const account = await accountModel.findOne(query);

        if (!account) {
            res.status(404).send('Conta inexistente');
            res.end();
        }

        const updatedBalance = account.balance + params.value;
        const updatedAccount = await accountModel.updateOne(query, { balance: updatedBalance });

        res.status(200).send(`Saldo atualizado: ${updatedBalance}`);

    } catch (error) {
        res.status(500).send('Erro ao realizar o depósito')
    }
});

app.post('/withdraw', async (req, res) => {
    try {
        let params = req.body;

        const query = { conta: params.conta };
        const account = await accountModel.findOne(query);

        if (!account) {
            res.status(400).send('Conta inexistente');
            res.end();
        }

        const withdrawalFee = 1;
        const updatedBalance = (account.balance - params.value) - withdrawalFee;

        if (updatedBalance < 0) {
            res.status(500).send('Não há saldo suficiente para saque');
        } else {
            const updatedAccount = await accountModel.updateOne(query, { balance: updatedBalance });

            res.status(200).send('Saldo atualizado: ' + updatedBalance);
        }
    } catch (error) {
        res.status(500).send('Erro ao relizar o saque.');
    }
});

app.post('/balance', async (req, res) => {
    try {
        let params = req.body;

        const query = { agencia: params.agencia, conta: params.conta };
        const account = await accountModel.findOne(query);

        if (!account) {
            res.status(404).send('Agência e/ou conta inexistente(s)');
        }

        res.status(200).send(`Saldo: ${account.balance}`);
    } catch (error) {
        res.status(500).send('Erro ao consulta o saldo');
    }
});

app.delete('/', async (req, res) => {
    try {
        let params = req.body;

        const query = { agencia: params.agencia, conta: params.conta };
        const deletedAccount = await accountModel.findOneAndDelete(query);

        if (!deletedAccount) {
            res.status(400).send('Dados de agência e/ou conta não encontrado(s)');
        } else {
            const accounts = await accountModel.find({agencia: params.agencia});

            res.status(200).send(`Número de contas ativas da agência ${params.agencia}: ${accounts.length}`);
        }
    } catch (error) {
        res.status(500).send('Erro ao excluir conta');
    }
});

app.post('/transfer', async (req, res) => {
    try {
        let params = req.body;

        const queryContaOrigem = { conta: params.contaOrigem };
        const queryContaDestino = { conta: params.contaDestino };

        const accountOrigem = await accountModel.findOne(queryContaOrigem);
        const accountDestino = await accountModel.findOne(queryContaDestino);

        const updatedBalanceContaDestino = accountDestino.balance + params.value;
        const updatedAccountDestino = await accountModel.updateOne(queryContaDestino, { balance: updatedBalanceContaDestino });

        let transferFee = accountOrigem.agencia !== accountDestino.agencia ? 8 : 0;

        const updatedBalanceContaOrigem = accountOrigem.balance - (params.value + transferFee);
        const updatedAccountOrigem = await accountModel.updateOne(queryContaOrigem, { balance: updatedBalanceContaOrigem });

        res.status(200).send(`Saldo da conta ${params.contaOrigem}: ${updatedBalanceContaOrigem}`);
    } catch (error) {
        res.status(500).send('Erro ao transferir dinheiro entre contas');
    }
});

app.get('/averageBalance/:agency', async (req, res) => {
    try {
        const agency = Number(req.params.agency);
        const average = await accountModel.aggregate([ 
            { $match: { agencia: agency } },
            {
                $group: {
                    _id: null,
                    averageBalance: { $avg: "$balance" }
                }
            }
        ]);        

        res.status(200).send(`Média do saldo das contas da agência ${agency}: ${average[0].averageBalance}`);
        
    } catch (error) {
        res.status(500).send('Erro ao calcular a média do saldo dos clientes da agência');        
    }
});

app.get('/lowestBalance/:quantity', async (req, res) => {
    try {
        const quantity = Number(req.params.quantity);
        const accounts = await accountModel.aggregate(
            [
                { $sort: { balance: 1 } },
                { $limit: quantity }
            ]
        );

        res.status(200).send(accounts);
    } catch (error) {
        res.status(500).send('Erro ao recuperar os clientes com menor saldo em conta');
    }
});

app.get('/highestBalance/:quantity', async (req, res) => {
    try {
        const quantity = Number(req.params.quantity);
        const accounts = await accountModel.aggregate(
            [
                { $sort: { balance: -1, nome: 1 } },
                { $limit: quantity }
            ]
        );

        res.status(200).send(accounts);
    } catch (error) {
        res.status(500).send('Erro ao recuperar os clientes com menor saldo em conta');
    }
});

app.post('/transferCustomerHigherBalance', async (req, res) => {
    try {
        const accounts = await accountModel.aggregate([
            {
                $group: {
                    _id: "$agencia",
                    higherBalance: { $max: "$balance" }
                }
            }
        ]);
        

        for (let i = 0; i < accounts.length; i++) {
            const query = { agencia: accounts[i]._id, balance: accounts[i].higherBalance };
            const filteredAccount = await accountModel.find(query);
            const updatedAccount = await accountModel.updateOne(query, { agencia: 99 });
        }
        
        const queryPrivateAgency = { agencia: 99 };
        const privateAccounts = await accountModel.find(queryPrivateAgency);

        res.status(200).send(privateAccounts);
        
    } catch (error) {
        res.status(500).send('Erro ao transferir usuários com maiores saldos para a agência 99');
    }
});

app.get('/clientsPrivate', async (req, res) => {
    try {
        const privateAgency = 99;
        const query = { agencia: privateAgency };
        const accounts = await accountModel.find(query);

        res.status(200).send(accounts);
        
    } catch (error) {
        res.status(500).send('Erro ao listar os clientes da agência private');
    }
});


export { app as accountRouter };