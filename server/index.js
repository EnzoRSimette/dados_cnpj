import express from "express";
import cors from "cors";
import multer from "multer";
import Database from "better-sqlite3";

class Server {
    #db;
    #app;

    constructor(port) {
        this.#app = express();
        this.#db = new Database("dados_empresas.db");
        this.#db.pragma("foreign_keys = ON");
        this.#app.use(cors());
        this.#app.use(express.json());
        this.upload = multer({ storage: multer.memoryStorage() });
        this.criarTabelas();
        this.criarRotas();
        this.#app.listen(port, () =>
            console.log(`Servidor rodando em http://localhost:${port}`),
        );
    }

    criarTabelas() {
        this.#db
            .prepare(
                `CREATE TABLE IF NOT EXISTS empresas (
                cnpj TEXT PRIMARY KEY,
                razao_social TEXT,
                nome_fantasia TEXT,
                uf TEXT,
                municipio TEXT,
                logradouro TEXT,
                numero TEXT,
                complemento TEXT,
                bairro TEXT,
                cep TEXT,
                cnae_fiscal INTEGER,
                cnae_fiscal_descricao TEXT,
                capital_social REAL,
                porte TEXT,
                natureza_juridica TEXT,
                situacao_cadastral INTEGER,
                descricao_situacao_cadastral TEXT,
                data_inicio_atividade TEXT,
                ddd_telefone_1 TEXT,
                email TEXT
            )`,
            )
            .run();

        this.#db
            .prepare(
                `CREATE TABLE IF NOT EXISTS socios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cnpj_empresa TEXT,
                nome_socio TEXT,
                qualificacao_socio TEXT,
                data_entrada_sociedade TEXT,
                faixa_etaria TEXT,
                pais TEXT,
                FOREIGN KEY (cnpj_empresa) REFERENCES empresas(cnpj)
            )`,
            )
            .run();

        console.log("Tabelas prontas.");
    }

    async getDados(cnpj) {
        try {
            const response = await fetch(
                `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
                { headers: { "User-Agent": "PeschelApp/1.0" } },
            );
            if (!response.ok) {
                return {
                    erro: `CNPJ ${cnpj} não encontrado`,
                    status: response.status,
                };
            }
            return await response.json();
        } catch (err) {
            return { erro: `Falha na conexão: ${err.message}` };
        }
    }

    inserirEmpresa(data) {
        if (!data || data.erro) return false;
        this.#db
            .prepare(
                `INSERT OR REPLACE INTO empresas (
                cnpj, razao_social, nome_fantasia, uf, municipio,
                logradouro, numero, complemento, bairro, cep,
                cnae_fiscal, cnae_fiscal_descricao, capital_social, porte,
                natureza_juridica, situacao_cadastral, descricao_situacao_cadastral,
                data_inicio_atividade, ddd_telefone_1, email
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
                data.cnpj,
                data.razao_social,
                data.nome_fantasia,
                data.uf,
                data.municipio,
                data.logradouro,
                data.numero,
                data.complemento ?? null,
                data.bairro,
                data.cep,
                data.cnae_fiscal ?? null,
                data.cnae_fiscal_descricao ?? null,
                data.capital_social ?? null,
                data.porte ?? null,
                data.natureza_juridica ?? null,
                data.situacao_cadastral ?? null,
                data.descricao_situacao_cadastral ?? null,
                data.data_inicio_atividade ?? null,
                data.ddd_telefone_1 ?? null,
                data.email ?? null,
            );
        return true;
    }

    inserirSocios(qsa, cnpj) {
        if (!Array.isArray(qsa) || qsa.length === 0) return;
        // Limpa sócios antigos antes de reinserir (evita duplicatas em re-consulta)
        this.#db.prepare(`DELETE FROM socios WHERE cnpj_empresa = ?`).run(cnpj);

        const stmt = this.#db.prepare(
            `INSERT INTO socios (cnpj_empresa, nome_socio, qualificacao_socio, data_entrada_sociedade, faixa_etaria, pais)
             VALUES (?,?,?,?,?,?)`,
        );
        for (const socio of qsa) {
            stmt.run(
                cnpj,
                socio.nome_socio ?? null,
                socio.qualificacao_socio ?? null,
                socio.data_entrada_sociedade ?? null,
                socio.faixa_etaria ?? null,
                socio.pais ?? null,
            );
        }
    }

    salvarTudo(data) {
        if (!data || data.erro) return;
        const salvar = this.#db.transaction((d) => {
            this.inserirEmpresa(d);
            this.inserirSocios(d.qsa ?? [], d.cnpj);
        });
        try {
            salvar(data);
        } catch (e) {
            console.error(`Erro ao salvar ${data.cnpj}:`, e.message);
        }
    }

    // Retorna todas as empresas com seus sócios em formato de array
    buscarTodasEmpresas() {
        const empresas = this.#db.prepare(`SELECT * FROM empresas`).all();
        return empresas.map((empresa) => {
            const socios = this.#db
                .prepare(`SELECT * FROM socios WHERE cnpj_empresa = ?`)
                .all(empresa.cnpj);
            return { ...empresa, qsa: socios };
        });
    }

    normalizarCnpj(cnpj) {
        return cnpj.trim().replace(/[\.\-\/]/g, "");
    }

    normalizarTxt(txt) {
        return txt
            .split("\n")
            .map((l) => this.normalizarCnpj(l))
            .filter((l) => l.length === 14); // CNPJ sem formatação tem 14 dígitos
    }

    verExtensao(filename) {
        return filename.split(".").pop();
    }

    criarRotas() {
        // Rota raiz: retorna todas as empresas salvas no banco
        this.#app.get("/empresas", (req, res) => {
            try {
                const empresas = this.buscarTodasEmpresas();
                res.json({ sucesso: true, dados: empresas });
            } catch (e) {
                res.status(500).json({ sucesso: false, erro: e.message });
            }
        });

        // Consulta CNPJ único na BrasilAPI (e salva no banco)
        this.#app.get("/cnpj/:cnpj", async (req, res) => {
            const cnpj = this.normalizarCnpj(req.params.cnpj);
            const data = await this.getDados(cnpj);
            if (!data.erro) this.salvarTudo(data);
            res.json({ sucesso: !data.erro, dados: data });
        });

        // Upload de arquivo .txt com lista de CNPJs
        this.#app.post(
            "/arquivo",
            this.upload.single("arquivo"),
            async (req, res) => {
                if (this.verExtensao(req.file.filename) !== "txt") {
                    return res.status(415).json({
                        sucesso: false,
                        erro: "O arquivo enviado não é .txt",
                    });
                }
                if (!req.file) {
                    return res.status(400).json({
                        sucesso: false,
                        erro: "Nenhum arquivo enviado",
                    });
                }

                const cnpjs = this.normalizarTxt(
                    req.file.buffer.toString("utf-8"),
                );
                if (cnpjs.length === 0) {
                    return res.status(400).json({
                        sucesso: false,
                        erro: "Nenhum CNPJ válido encontrado no arquivo",
                    });
                }

                const resultados = [];
                const erros = [];

                for (const cnpj of cnpjs) {
                    const data = await this.getDados(cnpj);
                    if (data.erro) {
                        erros.push({ cnpj, erro: data.erro });
                    } else {
                        this.salvarTudo(data);
                        resultados.push(data);
                    }
                }

                console.log(
                    `Processados: ${resultados.length} OK, ${erros.length} erros`,
                );
                res.json({
                    sucesso: true,
                    processados: resultados.length,
                    erros: erros.length,
                    detalhes_erros: erros,
                    dados: resultados, // array de empresas para o Dashboard
                });
            },
        );
    }
}

new Server(3333);
