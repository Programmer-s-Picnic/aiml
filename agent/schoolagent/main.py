from school_agent import SchoolAgent


def main():
    school_agent = SchoolAgent()

    commands = (
        ("greet",),
        ("mark attendance", "Champak", "Present"),
        ("mark attendance", "Amit", "Absent"),
        ("mark attendance", "Aryan", "Present"),
        ("show attendance",),
        ("stop",),
    )

    for command in commands:
        result = school_agent.handle(command)
        print(f"Result:\n{result}")

        if command[0].lower() == "stop":
            break


if __name__ == "__main__":
    main()
