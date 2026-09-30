# DependaDash

<img width="1244" height="1613" alt="DependaDash screenshot" src="https://github.com/user-attachments/assets/29f49d78-d09b-4b0e-aecc-0f43bbda1fc5" />

This is a small self-contained dashboard that can be used to view all of your GitHub Dependabot alerts together across repositories owned by your user account or an organization you belong to. 

Since we can't call the GitHub API directly from a webpage, it generates a GitHub CLI command and then reads the resulting TSV file in your browser to provide you filtering, advisory grouping, and a CSV export.

## How to use

### Set up GH CLI

Since DependaDash can't run commands itself nor directly call the GitHub API, it relies on using your locally installed GitHub CLI client. You can download the GitHub CLI at https://cli.github.com/. Afterwards, you'll also have to run `gh auth login` and log in through the web browser.

### Generate the report

Open `index.html` in a browser, enter your GitHub user or organization in the first step, and copy the generated command in order to run it in a terminal as-is. The command will create a `dependabot-alerts-<owner>.tsv` file in your current directory.

### Visualize the report

Go back into DependaDash and drop the generated .tsv file into the dashboard to view all of the alerts. 

## AI Usage

This is the first time I'm adding a notice like this to one of my repositories, so hopefully this helps you inform yourself of your decision of using or contributing to this project. *All of the code for this project has been generated using LLMs* such as ChatGPT 5.6 Sol High, or later models. 

Meanwhile, *this `README.md` file you're reading is completely human-written*, with [LanguageTool](https://languagetool.org/) being used to review grammar and writing mistakes (as is with most of the text I've ever published on the internet). I don't use LanguageTool's parapharasing capabilities and I don't allow AI to rewrite this to make it "cleaner".

## License

DependaDash is licensed under the GNU Affero General Public License v3-or-later. See the `LICENSE` file for more information.

