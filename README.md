<p align="center">
    <img width="600" alt="Stratus Tools" src="https://i.imgur.com/gXvZKYB.png">
</p>
<p align="center">A Github Action that fetches test summaries from a TestRail test run and send comment to a pull request</p>

---

[![Build](https://github.com/q4mobile/stratus-testrail-presenter/actions/workflows/build.yml/badge.svg?branch=develop)](https://github.com/q4mobile/stratus-testrail-presenter/actions/workflows/build.yml)

# Stratus TestRail Presenter

This action is designed to provide:
- Summary of the latest TestRail run for the pull request, passed percentage, failed count etc.
- Summary of branch/story/case related tests in the latest TestRail run, passed count ect.
- A comment in the pull request to demonstrate these information

## Inputs

##### `current_branch`
The source GitHub branch (if action is triggered by pull request).
This is used to determine the related tests for a story/case.

##### `network_url` (**Required**)
The TestRail account domain name. Ex: `https://<YourProjectURL>.testrail.com`.

##### `username` (**Required**)
The username associated with the test runner. Usually an email address.

##### `api_key` (**Required**)
The API key associated with the username.

##### `project_id` (**Optional**)
The project ID of the TestRail project.

##### `run_id` (**Required**)
The ID of the TestRail Run.

## Outputs

##### `run_result`
The summary content of the specific TestRail run.


## Example usage

```yml
- name: Get Testrail Run Summary
    uses: q4mobile/stratus-testrail-presenter@v1
    with:
      network_url: ${{ secrets.testrail_network_url }}
      username: ${{ secrets.testrail_user_email }}
      api_key: ${{ secrets.testrail_api_key }}
      project_id: 20
      run_id: 30001
      current_branch: ${{ github.event.pull_request.head.ref }}
```

## Development

### Building the action

To work locally, typescript code needs to be built and committed. Run the following command and commit all changes as usual:
```shell
npm run build:package
```
