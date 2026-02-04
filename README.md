# 📸 Ache sua Foto | Stand M&M's & Snickers

> Sistema de entrega automatizada de fotos desenvolvido para ativação de marca em parceria com agência de Marketing e Publicidade.

Este projeto foi concebido para atender à demanda de um stand de fotos durante um evento de grande porte (estimativa de 8.000 pessoas/dia). A solução permite que participantes localizem e baixem suas fotos de forma individual, rápida e segura através de um QR Code.

---

## 🍬 O Projeto

Durante os dias 07 e 08 de fevereiro de 2026, participantes tiram fotos profissionais no stand das marcas **M&M's** e **Snickers**. O desafio era criar uma plataforma **Mobile First** que eliminasse a necessidade de galerias públicas, garantindo a privacidade de cada usuário.

### 🚀 Funcionalidades Principais

* **Busca Individual:** Localização de fotos através de número sequencial informado pelo fotógrafo.
* **Filtro por Data:** Seletor intuitivo para os dias 07 e 08 de fevereiro.
* **Download Inteligente:** Botão de download direto via Blob para garantir compatibilidade com dispositivos móveis.
* **Segurança (Anti-Spam):** Sistema de *Cooldown* de 10 minutos por dispositivo (LocalStorage) para evitar acessos repetitivos.
* **Privacidade Total:** Implementação de `noindex` para motores de busca e ausência de navegação entre fotos de terceiros.
* **Painel Administrativo:** Área restrita para fotógrafos com upload automatizado e padronização de nomenclatura (`BBD_XXXX.jpg`).

---

## 🛠️ Stack Tecnológica

O projeto utiliza o que há de mais moderno em desenvolvimento Web para garantir escala e performance sob alto tráfego:

* **Frontend:** [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (Design Temático Candy)
* **Banco de Dados & Auth:** [Supabase](https://supabase.com/)
* **Storage (CDN):** [Cloudflare R2](https://www.cloudflare.com/products/r2/) (S3 Compatible)
* **Hospedagem:** [Vercel](https://vercel.com/)
* **Ícones:** [Lucide React](https://lucide.dev/)

---

## 📐 Arquitetura e Performance

Para suportar múltiplos acessos simultâneos em redes 4G instáveis:
1.  **Otimização de Imagem:** Limite de 5MB por upload para garantir fluidez no download.
2.  **Padronização:** O sistema trata entradas numéricas (ex: "1") e converte para o padrão de quatro dígitos exigido (`BBD_0001`).
3.  **Entrega via Edge:** Uso do Cloudflare R2 para baixa latência na entrega das imagens.

---

## 🛡️ Regras de Negócio e Segurança

* **Não indexação:** O site não aparece em buscas do Google, protegendo a imagem dos participantes.
* **Sem Galeria:** A única forma de acessar uma foto é possuindo o número exato.
* **Operação Autônoma:** Sistema projetado para funcionar sem intervenção humana após o upload inicial do fotógrafo.

---

## 👤 Desenvolvedor

**[Yssaky Assad Luz]** *Estudante de Bacharelado em Ciência da Computação – Faculdade São Judas Tadeu* Passonado por tecnologia, desenvolvimento Fullstack e soluções escaláveis.

---

*Este projeto é fruto de uma colaboração estratégica entre tecnologia de ponta e estratégias de marketing de experiência para marcas globais.*
