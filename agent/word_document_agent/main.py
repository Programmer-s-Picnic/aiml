"""Start the two-agent application."""

from hello_agent import HelloAgent


if __name__ == "__main__":
    agent = HelloAgent()

    commands = (
        "greet",
        "time",
        "eat",
        "create test.docx",
        "write Hello Champak Roy",
        "font Arial 24",
        "save",
        "read",
    )
    results = agent.Observe(("greet"))
    # results = agent.Observe(commands)

    print("\nResults received by HelloAgent:")
    for result in results:
        print(result)

    print("\nInteractive mode started. Type help to see commands.")
    agent.run()
