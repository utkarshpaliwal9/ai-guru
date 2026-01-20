from crewai import agent, task, Crew, Process

@agent
class AzulaAgent:
    role = "Browser agent"
    goal = "Visit URLs and extract HTML"

    def run(self, url: str):
        # TODO integrate MCP Playwright call; placeholder for now
        return f"<html>Dummy content from {url}</html>"

@agent
class RelevanceAgent:
    role = "Relevance checker"
    goal = "Determine if HTML is relevant to sales tax"

    def run(self, html: str):
        return "relevant" if "tax" in html.lower() else "irrelevant"

@agent
class FindingAgent:
    role = "Finding creator"
    goal = "Create structured finding from relevant page"

    def run(self, html: str):
        return {"finding": "Sample finding details", "source_length": len(html)}

@task
def fetch_url_task(url: str):
    return AzulaAgent().run(url)

@task
def check_relevance_task(html: str):
    return RelevanceAgent().run(html)

@task
def create_finding_task(html: str):
    return FindingAgent().run(html)

class SourcingWorkflowCrew:
    def __init__(self):
        self.agents = [AzulaAgent(), RelevanceAgent(), FindingAgent()]
        self.tasks = [fetch_url_task, check_relevance_task, create_finding_task]

    def crew(self):
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )

# CrewAI loader expects flow_cls
flow_cls = SourcingWorkflowCrew 