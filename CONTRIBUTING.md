# Contributing

Pull requests are welcome. For major changes please open an issue first to discuss what you would like to change.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/).
4. Open a pull request.

## Development

Clone the repo and link the plugin to a local Strapi project:

```bash
git clone https://github.com/devCluna/strapi-plugin-form-builder-cms.git
cd strapi-plugin-form-builder-cms
npm install

# watch mode: rebuilds on save
npm run watch:link
```

In your local Strapi project:

```bash
npm run develop
```

Run the test suite (Vitest) and type-checks:

```bash
npm test              # unit tests
npm run test:ts:back  # type-check the server
npm run test:ts:front # type-check the admin
```
