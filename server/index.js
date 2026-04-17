import { error } from "console";
import express from "express";
import fs from "fs";

const txtInput = document.querySelector("#inputArquivoTxt");
let txtFile;
txtInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    txtFile = file;
});

class App {
    // Cria novo App
    #app;
    constructor(port) {
        this.#app = express();
        this.#app.listen(port);
        this.criarRotas();
    }

    async getDados(cnpj) {
        const response = await fetch(
            `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
            {
                headers: {
                    "User-Agent": "MeuApp/1.0",
                },
            },
        ); // Tenta fazer conexão com api
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} | ERROR ${response.statusText}`,
            ); // Retorna se der erro
        }
        const data = await response.json();
        console.log(data);
        return data; //* Exibe os dados se der sucesso
    }

    criarRotas() {
        this.#app.get("/:cnpj", async (req, res) => {
            const data = await this.getDados(req.params.cnpj);
            res.json({ sucesso: true, dados: data });
        });
    }

    lerTxt(file) {
        const content = fs.readFile(file, "utf-8", (err, data) => {
            if (err) {
                throw err;
            }
        });
        return content;
    }

    contentParaArray(content) {
        if (content) {
            const data = content.split("\n").replaceAll("\r", "");
            return data;
        } else throw new Error("ERRO EM CONTENT_PARA_ARRAY");
    }

    async processarApiLote(array) {
        let pares = new Map();
        for (const element of array) {
            const data = await this.getDados(element);
            pares.set(element, data);
        }
        return pares;
    }
}

const app = new App(3333);
app.getDados(`00474479000106`);
