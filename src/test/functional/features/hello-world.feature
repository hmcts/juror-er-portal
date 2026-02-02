Feature: Initial Functional test

    Scenario: The home page loads
        When I go to '/'
        Then the page should include 'Sign in to the electoral register data portal' 