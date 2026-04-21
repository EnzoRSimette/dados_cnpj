import express from "express";
import cors from "cors"; // Importante!
import fs, { readFile } from "fs";
import multer from "multer";
import Database from "better-sqlite3";

class Server {
    #db;
    #app;
    constructor(port) {
        this.#app = express();
        this.#db = new Database("dados_empresas.db");
        this.#db.pragma("foreign_keys = ON");
        this.#app.use(cors()); // Libera o acesso para o React
        this.#app.use(express.json());
        this.upload = multer({ storage: multer.memoryStorage() });
        this.criarRotas();
        this.criarTabelas();
        this.#app.listen(port, () =>
            console.log(`Servidor rodando em http://localhost:${port}`),
        );
    }

    criarTabelas() {
        const empresas = this.#db.prepare(`--sql;
            CREATE TABLE IF NOT EXISTS empresas (
                cnpj TEXT PRIMARY KEY,
                razao_social TEXT,
                nome_fantasia TEXT,
                uf TEXT,
                municipio TEXT,
                logradouro TEXT,
                numero TEXT,
                bairro TEXT,
                cep TEXT,
                cnae_fiscal INTEGER,
                cnae_descricao TEXT,
                capital_social REAL,
                porte TEXT,
                natureza_juridica TEXT,
                situacao_cadastral INTEGER,
                descricao_situacao_cadastral TEXT,
                data_inicio_atividade TEXT
            );
        `);
        const socios = this.#db.prepare(`--sql;
            CREATE TABLE IF NOT EXISTS socios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cnpj_empresa TEXT,
                FOREIGN KEY (cnpj_empresa) REFERENCES empresas(cnpj),
                nome_socio TEXT,
                qualificacao TEXT,
                data_entrada TEXT
            );
        `);
        try {
            empresas.run();
            socios.run();
            console.log("Tabelas criadas!");
        } catch (e) {
            console.log(e);
        }
    }

    async getDados(cnpj) {
        try {
            const response = await fetch(
                `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
                {
                    headers: {
                        "User-Agent": "MeuApp/1.0",
                    },
                },
            );
            if (!response.ok)
                return { erro: "CNPJ não encontrado", status: response.status };
            return await response.json();
        } catch (err) {
            return { erro: "Falha na conexão com a API" };
        }
    }

    criarRotas() {
        // Rota que o React vai chamar
        this.#app.get("/:cnpj", async (req, res) => {
            const data = await this.getDados(req.params.cnpj);
            res.json({ sucesso: true, dados: data });
        });

        this.#app.post(
            "/arquivo",
            this.upload.single("arquivo"),
            async (req, res) => {
                if (!req.file) {
                    return res
                        .status(400)
                        .json({ erro: "Nenhum arquivo enviado" });
                }
                const txtData = req.file.buffer.toString("utf-8");

                const arrayCnpjs = this.normalizarTxtComArray(txtData);
                let informacoesCnpjs = {};
                for (const cnpj of arrayCnpjs) {
                    const data = await this.getDados(cnpj);
                    informacoesCnpjs[cnpj] = data;
                    this.inserirDadosEmpresas(data);
                    if (Array.isArray(data.qsa)) {
                    data.qsa.forEach((socio) => {
                        this.inserirDadosSocios(socio, cnpj);
                    });
                    }
                }

                res.send({ status: "ok", data: informacoesCnpjs });
            },
        );
    }

    inserirDadosEmpresas(data) {
        if (data.erro) continue;
        const query = this.#db.prepare(`--sql
            INSERT OR IGNORE INTO empresas (
                cnpj,
                razao_social,
                nome_fantasia,
                uf,
                municipio,
                logradouro,
                numero,
                bairro,
                cep,
                cnae_fiscal,
                cnae_descricao,
                capital_social,
                porte,
                natureza_juridica,
                situacao_cadastral,
                descricao_situacao_cadastral,
                data_inicio_atividade
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);
        try {
            query.run(
                data.cnpj,
                data.razao_social,
                data.nome_fantasia,
                data.uf,
                data.municipio,
                data.logradouro,
                data.numero,
                data.bairro,
                data.cep,
                data.cnae_fiscal,
                data.cnae_descricao,
                data.capital_social,
                data.porte,
                data.natureza_juridica,
                data.situacao_cadastral,
                data.descricao_situacao_cadastral,
                data.data_inicio_atividade,
            );
        } catch (e) {
            console.log(e);
        }
    }

    inserirDadosSocios(data, cnpjEmpresa) {
        if (data.erro) continue;
        const query = this.#db.prepare(`--sql
            INSERT INTO socios (
                cnpj_empresa,
                nome_socio,
                qualificacao,
                data_entrada
            ) VALUES (
                ?,?,?,?
            )
        `);
        try {
            query.run(
                cnpjEmpresa,
                data.nome_socio,
                data.qualificacao_socio,
                data.data_entrada_sociedade,
            );
        } catch (e) {
            console.log(e);
        }
    }

    consultarDadosTodasEmpresas() {
        const query = this.#db.prepare(`--sql;
            SELECT * FROM empresas;
        `);
        try { const response = query.all(); }
        catch (e) { console.log(e) }
        return response;
    }

    consultarDadosCnpjEspecifico(cnpj) {
        const query = this.#db.prepare(`--sql;
            SELECT * FROM empresas WHERE cnpj = (?)
        `);
        try { const response = query.get(cnpj); }
        catch (e) {console.log(e)}
        return response;
    }

    consultarDadosSocios(cnpj) {
        const query = this.#db.prepare(`--sql;
            SELECT * FROM socios WHERE cnpj_empresa = (?);
        `);
        try { const response = query.run(cnpj); }
        catch (e) { console.log(e) }
        return response;
    }

    normalizarTxtComArray(data) {
        return data
            .split("\n")
            .map((element) => this.normalizarCnpj(element))
            .filter((element) => element);
    }

    normalizarCnpj(cnpj) {
        const newCnpjNormalized = cnpj
            .trim()
            .replaceAll(".", "")
            .replaceAll("/", "")
            .replaceAll("-", "");
        return newCnpjNormalized;
    }
}

new Server(3333);
