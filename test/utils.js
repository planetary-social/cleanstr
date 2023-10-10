import axios from 'axios';

export async function assertDataStoreEmulatorIsRunning() {
  try {
    const response = await axios.get('http://localhost:8081/', {
      timeout: 1000,
    });

    if (response.status !== 200) {
      throw new Error(
        `You need to run the Datastore emulator before running tests`
      );
    }
  } catch (error) {
    throw new Error(
      `You need to run the Datastore emulator before running tests`
    );
  }
}

export async function resetDataStore() {
  await axios.post('http://localhost:8081/reset');
}

// Helper function to log all stub call arguments during debugging
export function logAllCallArguments(stub) {
  for (let i = 0; i < stub.callCount; i++) {
    const callArgs = stub.getCall(i).args;
    process.stdout.write(
      `Call ${i + 1} arguments: ${JSON.stringify(callArgs)}\n`
    );
  }
}
